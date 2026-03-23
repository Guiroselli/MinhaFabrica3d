import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  User, 
  Dog, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Box, 
  Sparkles, 
  Shirt, 
  ArrowRight,
  Info,
  MessageCircle,
  HelpCircle,
  ShieldCheck,
  Truck,
  Clock,
  X,
  Menu,
  Wand2,
  LogOut,
  Mail,
  Lock,
  UserRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from '@google/genai';
import { SubjectType, BodyStyle, CustomOrder, SavedOrder } from './types';
import { BODY_STYLES, SHOWCASE } from './constants';
import { AuthUser, getSessionUser, loginUser, loginWithGoogle, logoutUser, registerUser, subscribeToAuthChanges } from './auth';
import { createOrder, listOrders } from './orders';
import logoGoogle from '../logoGoogle.jpg';
import heroBonecoExample from '../boneco3d_enhanced.png';

type Step = 'welcome' | 'type' | 'upload' | 'style' | 'preview' | 'review' | 'success';
type View = 'home' | 'auth' | 'account';
type AuthMode = 'login' | 'register';

interface AuthFormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const INITIAL_AUTH_FORM: AuthFormState = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const DRAFT_STORAGE_KEY = 'minha_fabrica3d_draft';
const POST_AUTH_ACTION_KEY = 'minha_fabrica3d_post_auth_action';

// Inicialização do SDK do Gemini (usando a key do projeto)
// Certifique-se de que no seu .env exista VITE_GEMINI_API_KEY="sua_chave_aqui"
const ai = new GoogleGenAI({ 
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || 'CHAVE_OMITIDA_PARA_EVITAR_ERRO' 
});

export default function App() {
  const [view, setView] = useState<View>('home');
  const [step, setStep] = useState<Step>('welcome');
  const [subjectType, setSubjectType] = useState<SubjectType | null>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<BodyStyle | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authForm, setAuthForm] = useState<AuthFormState>(INITIAL_AUTH_FORM);
  const [orders, setOrders] = useState<SavedOrder[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [postAuthAction, setPostAuthAction] = useState<'none' | 'finalizeOrder'>('none');
  const [isDraftReady, setIsDraftReady] = useState(false);
  const [hasPendingAuthReturn, setHasPendingAuthReturn] = useState(false);
  
  // Gemini States
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [geminiPreviewData, setGeminiPreviewData] = useState<string | null>(null);
  const [geminiPrompt, setGeminiPrompt] = useState<string>("PROMPT_AQUI"); // O usuário irá alterar isso

  const fileInputRef = useRef<HTMLInputElement>(null);
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);

  const steps = [
    { id: 'type', label: 'Tipo' },
    { id: 'upload', label: 'Foto' },
    { id: 'style', label: 'Estilo' },
    { id: 'preview', label: 'Prévia AI' },
    { id: 'review', label: 'Revisão' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);
  const firstName = authUser?.name.split(' ')[0] || 'Cliente';
  const accountButtonLabel = authUser ? firstName.toUpperCase() : 'MINHA CONTA';
  const shouldShowOAuthProcessing = view === 'account' && hasPendingAuthReturn && !authUser;

  const renderAccountButtonContent = () => {
    if (isAuthLoading) {
      return 'CARREGANDO...';
    }

    if (!authUser) {
      return 'MINHA CONTA';
    }

    return (
      <span className="inline-flex items-center gap-2">
        {authUser.avatarUrl ? (
          <span className="w-6 h-6 rounded-full overflow-hidden border border-black/10">
            <img src={authUser.avatarUrl} alt={authUser.name} className="w-full h-full object-cover" />
          </span>
        ) : (
          <span className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center text-[11px] font-black">
            {firstName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span>{accountButtonLabel}</span>
      </span>
    );
  };

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const sessionUser = await getSessionUser();

      if (!isMounted) {
        return;
      }

      setAuthUser(sessionUser);
      setIsAuthLoading(false);
    };

    const unsubscribe = subscribeToAuthChanges((sessionUser) => {
      if (!isMounted) {
        return;
      }

      setAuthUser(sessionUser);
      setIsAuthLoading(false);
    });

    loadSession();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);

      if (params.get('authView') === 'account') {
        setView('account');
        setHasPendingAuthReturn(true);
      }

      const draftJson = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (draftJson) {
        const draft = JSON.parse(draftJson) as {
          step?: Step;
          subjectType?: SubjectType | null;
          uploadedPhoto?: string | null;
          geminiPreviewData?: string | null;
          geminiPrompt?: string | null;
          selectedStyleId?: string | null;
        };

        if (draft.step) {
          setStep(draft.step);
        }

        if (draft.subjectType) {
          setSubjectType(draft.subjectType);
        }

        if (draft.uploadedPhoto) {
          setUploadedPhoto(draft.uploadedPhoto);
        }

        if (draft.geminiPreviewData) {
          setGeminiPreviewData(draft.geminiPreviewData);
        }

        if (draft.geminiPrompt) {
          setGeminiPrompt(draft.geminiPrompt);
        }

        if (draft.selectedStyleId) {
          setSelectedStyle(BODY_STYLES.find((style) => style.id === draft.selectedStyleId) || null);
        }
      }

      const storedAction = sessionStorage.getItem(POST_AUTH_ACTION_KEY);
      if (storedAction === 'finalizeOrder') {
        setPostAuthAction('finalizeOrder');
      }
    } catch (error) {
      console.warn('Nao foi possivel restaurar o rascunho local.', error);
    } finally {
      setIsDraftReady(true);
    }
  }, []);

  useEffect(() => {
    if (!hasPendingAuthReturn || !authUser) {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('authView');
    const nextSearch = url.searchParams.toString();
    const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`;

    window.history.replaceState({}, document.title, nextUrl);
    setHasPendingAuthReturn(false);
  }, [hasPendingAuthReturn, authUser]);

  useEffect(() => {
    if (!hasPendingAuthReturn || authUser) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHasPendingAuthReturn(false);
      setView('auth');
      setAuthError('Nao conseguimos concluir o login com Google. Verifique o callback do Supabase, o Client ID do Google Cloud e se seu usuario esta liberado para teste.');
    }, 8000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hasPendingAuthReturn, authUser]);

  useEffect(() => {
    if (!isDraftReady) {
      return;
    }

    try {
      sessionStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          step,
          subjectType,
          uploadedPhoto,
          geminiPreviewData,
          geminiPrompt,
          selectedStyleId: selectedStyle?.id || null,
        }),
      );
    } catch (error) {
      console.warn('Nao foi possivel salvar o rascunho local.', error);
    }
  }, [isDraftReady, step, subjectType, uploadedPhoto, geminiPreviewData, geminiPrompt, selectedStyle]);

  useEffect(() => {
    if (!authUser) {
      setOrders([]);
      setOrdersError(null);
      setIsOrdersLoading(false);
      return;
    }

    let isMounted = true;
    setIsOrdersLoading(true);
    setOrdersError(null);

    listOrders()
      .then((items) => {
        if (!isMounted) {
          return;
        }

        setOrders(items);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setOrdersError(error instanceof Error ? error.message : 'Nao foi possivel carregar seus pedidos.');
      })
      .finally(() => {
        if (!isMounted) {
          return;
        }

        setIsOrdersLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [authUser]);

  useEffect(() => {
    if (
      !authUser ||
      postAuthAction !== 'finalizeOrder' ||
      step !== 'review' ||
      !uploadedPhoto ||
      !geminiPreviewData ||
      isSavingOrder
    ) {
      return;
    }

    savePostAuthAction('none');
    void finalizeOrderForUser(authUser);
  }, [authUser, postAuthAction, step, uploadedPhoto, geminiPreviewData, isSavingOrder]);

  const goToHome = () => {
    setIsMobileMenuOpen(false);
    setView('home');
  };

  const clearDraftStorage = () => {
    try {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
  };

  const savePostAuthAction = (action: 'none' | 'finalizeOrder') => {
    setPostAuthAction(action);

    try {
      if (action === 'none') {
        sessionStorage.removeItem(POST_AUTH_ACTION_KEY);
      } else {
        sessionStorage.setItem(POST_AUTH_ACTION_KEY, action);
      }
    } catch {}
  };

  const openAuthView = (mode: AuthMode = 'login') => {
    setIsMobileMenuOpen(false);
    setAuthMode(mode);
    setAuthError(null);
    setView('auth');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAccountView = () => {
    setIsMobileMenuOpen(false);

    if (authUser) {
      setView('account');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    openAuthView('login');
  };

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    setIsMobileMenuOpen(false);
    if (view !== 'home' || step !== 'welcome') {
      setView('home');
      setStep('welcome');
      setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      ref.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      // Simulate base64 read for the AI and image preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setTimeout(() => {
          setUploadedPhoto(reader.result as string);
          setIsUploading(false);
          setStep('style');
        }, 2000);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCustomizer = () => {
    setView('home');
    setStep('type');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthFieldChange = (field: keyof AuthFormState, value: string) => {
    setAuthForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setIsAuthSubmitting(true);

    try {
      await loginWithGoogle();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Nao foi possivel entrar com Google.');
      setIsAuthSubmitting(false);
    }
  };

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);

    if (authMode === 'register') {
      if (authForm.name.trim().length < 2) {
        setAuthError('Informe seu nome para criar a conta.');
        return;
      }

      if (authForm.password !== authForm.confirmPassword) {
        setAuthError('As senhas nao coincidem.');
        return;
      }
    }

    setIsAuthSubmitting(true);

    try {
      const sessionUser =
        authMode === 'login'
          ? await loginUser({
              email: authForm.email,
              password: authForm.password,
            })
          : await registerUser({
              name: authForm.name.trim(),
              email: authForm.email,
              password: authForm.password,
            });

      setAuthUser(sessionUser);
      setAuthForm(INITIAL_AUTH_FORM);
      if (postAuthAction === 'finalizeOrder') {
        setView('home');
        setStep('review');
      } else {
        setView('account');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Nao foi possivel autenticar sua conta.');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } finally {
      setAuthUser(null);
      setOrders([]);
      setAuthForm(INITIAL_AUTH_FORM);
      setAuthMode('login');
      setAuthError(null);
      savePostAuthAction('none');
      setView('auth');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const finalizeOrderForUser = async (user: AuthUser) => {
    if (!subjectType || !uploadedPhoto || !geminiPreviewData) {
      setCheckoutError('Envie uma foto e gere a previa antes de finalizar o pedido.');
      return;
    }

    setCheckoutError(null);
    setOrdersError(null);
    setIsSavingOrder(true);

    try {
      const savedOrder = await createOrder({
        subjectType,
        styleId: selectedStyle?.id || null,
        styleName: selectedStyle?.name || null,
        totalAmount: selectedStyle ? 179.8 : 149.9,
        referenceImageDataUrl: uploadedPhoto,
        previewImageDataUrl: geminiPreviewData,
        promptSnapshot: geminiPrompt || null,
      });

      setOrders((current) => [savedOrder, ...current.filter((item) => item.id !== savedOrder.id)]);
      savePostAuthAction('none');
      clearDraftStorage();
      setView('home');
      setStep('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Nao foi possivel salvar o pedido no Supabase.');
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleFinalizeOrder = async () => {
    if (!authUser) {
      savePostAuthAction('finalizeOrder');
      openAuthView('login');
      setAuthError('Entre na sua conta para salvar o pedido e as imagens no Supabase.');
      return;
    }

    await finalizeOrderForUser(authUser);
  };

  // Função central da integração com o Gemini
  const generateGeminiPreview = async () => {
    if (!uploadedPhoto) return;
    setIsGeneratingPreview(true);
    setGeminiPreviewData(null);
    try {
      const isPerson = subjectType === 'person';

      // 1. Extrair Base64 da Foto Uploaded
      const base64Data = uploadedPhoto.split(',')[1];
      const mimeType = uploadedPhoto.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)?.[0] || 'image/jpeg';

      // 2. Extrair características principais pelo Gemini 2.5 Flash (Visão) FOCADO EM LIKENESS
      const visionPrompt = isPerson
        ? `Analyze only what is clearly visible in this reference photo and create a compact identity sheet in plain English for a 3D collectible figure. Treat the uploaded image as FACE REFERENCE ONLY. Ignore body framing, crop, camera distance, torso size, pose, and background. Focus on facial likeness first. Describe: face shape, forehead height, cheek fullness, jaw shape, chin shape, skin tone, hairline, hairstyle, hair volume, hair texture, hair color, eyebrow thickness, eyebrow shape, eye shape, eye size, eye spacing, eyelid openness, nose bridge, nose width, nose tip shape, mouth width, lip fullness, mustache shape, beard density, ear visibility, expression, visible top color, and do_not_add. If something is uncertain, write "unknown". Do not guess hidden details. Do not invent tattoos, glasses, jewelry, scars, or accessories unless clearly visible. Return short phrases only, no markdown, no bullet list, no extra explanation.`
        : `Analyze only what is clearly visible in this animal photo and create a compact identity sheet in plain English for a 3D collectible figure. Treat the uploaded image as HEAD AND MARKINGS REFERENCE FIRST. If the body is not fully visible, say body_visibility: partial and do not guess hidden anatomy. Describe: species, breed_guess, breed_confidence, skull width, head shape, ear length, ear droop, muzzle length, muzzle width, muzzle slenderness, eye size, eye shape, eye spacing, visible neck thickness, body_visibility, body build if visible, leg length if visible, tail shape if visible, coat length, primary coat color, secondary visible color, exact muzzle markings, exact chest marking shape, exact paw markings, visible collar color, visible tag text, colors_not_visible, markings_not_visible, and do_not_add. If something is uncertain, write "unknown". Do not guess breed traits or markings that are not visible. Return short phrases only, no markdown, no bullet list, no extra explanation.`;

      const visionResult = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { data: base64Data, mimeType } },
              { text: visionPrompt }
            ]
          }
        ]
      });
      const subjectDescription = visionResult.text?.trim() || 'unknown';

      // 3. Montar Prompt Rigoroso para o Imagen 3 (Forçando o design do Art Toy da foto)
      let finalPrompt = "";
      if (isPerson) {
        finalPrompt = `Create a premium studio render of a single 3D-printable designer vinyl collectible figure based only on this identity sheet: "${subjectDescription}".

Main goal:
preserve the person's likeness as accurately as possible, especially face shape, skin tone, hairline, hairstyle, hair volume, eyebrow thickness, eye size, nose width, mouth shape, jaw, ears, mustache, and beard density.
Use the uploaded photo as face reference only. Do not copy the selfie crop, camera distance, or partial body framing from the source image.

Figure style:
- designer toy / collectible vinyl figure
- head moderately oversized, about 20-25% larger than realistic proportions
- compact body
- clean, elegant, premium silhouette
- solid, non-articulated, one-piece look
- smooth matte surfaces
- stylized, but still clearly recognizable as the same person
- semi-realistic face with a simplified toy body
- do not beautify, glamorize, or idealize the person
- keep a natural neutral expression

Production constraints:
- use up to 4 solid flat colors only
- do not invent a fourth color if 3 are enough
- no gradients
- no micro details
- no tiny printed graphics
- no transparent parts
- no thin fragile parts
- clean shape suitable for multicolor 3D printing on a Bambu Lab A1 Combo with AMS

Pose and framing:
- create a complete figure from head to toe
- full body visible from the top of the hair to the bottom of the shoes
- slight three-quarter front view
- neutral standing pose
- arms close to the body
- both legs fully visible
- both feet fully visible
- centered composition
- camera pulled back enough to leave clean space above the head and below the feet
- isolated single figure only
- never crop the figure at the chest, waist, knees, or ankles

Body design rules:
- use the facial identity from the photo, but generate a complete toy body
- if the source photo is only a selfie or upper-body photo, still create a full-body collectible
- if no outfit is specified, use a simple full-body outfit with shirt, pants, and shoes
- keep the body stylized and proportional to a premium collectible toy
- keep the face more realistic than the body
- use a simple casual outfit with plain t-shirt, plain pants, and rounded shoes unless another style is selected
- keep the torso simple, the legs short and sturdy, and the shoes slightly rounded like a collectible figure

Likeness rules:
- preserve the real eyebrow thickness and eye size from the photo
- preserve the true mustache and beard shape without making them cleaner or fuller
- preserve the real hairline and hair direction
- do not make the face look more handsome, sharper, or more smiling than the real person
- do not exaggerate the head into an extreme chibi or bobblehead look

Scene:
- plain warm light-neutral studio background
- soft professional studio lighting
- subtle shadow under the figure
- nothing else in the scene

Do not add:
packaging, blister, box, base, accessories, props, extra objects, text, logos, labels, exaggerated cartoon features, tattoos, glasses, jewelry, or clothing details that are not clearly visible in the reference photo.`;
        if (selectedStyle && selectedStyle.name) {
          finalPrompt += ` Clothing direction: adapt the outfit to "${selectedStyle.name}" with this guidance: "${selectedStyle.description}". Keep the outfit simple, production-friendly, and limited to the same flat color system. Do not change the person's face, hair, skin tone, or identity.`;
        }
      } else {
        finalPrompt = `Create a premium studio render of a single 3D-printable designer vinyl collectible figure based only on this identity sheet: "${subjectDescription}".

Main goal:
preserve the animal's true likeness as accurately as possible, especially skull width, head shape, ear length, ear droop, muzzle length, muzzle width, muzzle slenderness, eye placement, body proportions, tail shape, muzzle markings, and exact coat marking placement.

Figure style:
- designer toy / collectible vinyl animal figure
- slightly stylized
- semi-realistic face and simplified toy body
- head only slightly enlarged, about 10-15% larger
- premium smooth vinyl look
- solid, non-articulated, one-piece figure
- rounded forms and clean silhouette

Anatomy:
- real animal anatomy only
- natural quadruped pose on all four legs if it is a dog or cat
- do not make it humanoid
- do not make it stand on two legs
- do not turn it into a cartoon mascot
- keep the head and face more realistic than the body
- keep the body simple, stable, and collectible-like
- if the body is only partially visible in the source photo, infer a conservative slim body that matches the head instead of inventing a broad or muscular build

Production constraints:
- use up to 4 solid flat colors only
- convert fur markings into clean color blocks
- no gradients
- no realistic fur strands
- no extra markings that are not visible in the reference
- suitable for multicolor 3D printing on a Bambu Lab A1 Combo with AMS

Pose and framing:
- full body visible
- standing on all four legs, not sitting
- front or slight three-quarter front view
- all four legs fully visible
- paws fully visible on the ground
- centered composition
- isolated single figure only
- do not crop ears, tail, legs, or paws

Likeness rules:
- preserve the exact head silhouette from the photo
- preserve long floppy ears if they are visible in the identity sheet
- preserve a narrow or slender muzzle if it is visible in the identity sheet
- preserve the exact white or gray muzzle area and exact chest patch placement
- keep the coat mostly in the visible real colors from the identity sheet
- if tan, brown, eyebrow spots, cheek patches, or extra body patches are not visible, do not add them
- do not widen the skull or shorten the muzzle
- do not turn the dog into a stocky bully-breed, boxer-like, or generic muscular dog unless that is clearly visible in the identity sheet

Scene:
- plain warm light-neutral studio background
- soft professional studio lighting
- subtle shadow under the figure
- nothing else in the scene

If breed is uncertain, prioritize visible anatomy and coat pattern over breed stereotypes.
If a collar or name tag is clearly visible, keep it simple and faithful.
Do not add packaging, accessories, props, extra text beyond a clearly visible tag name, logos, collar unless clearly visible, extra markings, humanoid posture, or decorative elements.`;
      }

      // 4. Gerar a imagem baseada na descrição e prompts (Tentando acessar o Imagen via SDK ou REST v1beta)
      // Como a chamada direta generateImages com 'imagen-3.0-generate-002' pode dar 404 dependendo da versão da API:
      setGeminiPrompt(finalPrompt);

      try {
        const imageResult = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001', // Atualizado para a versão 4.0 que já está disponível na sua conta
          prompt: finalPrompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: "3:4"
          }
        });

        if (imageResult.generatedImages && imageResult.generatedImages.length > 0) {
          setGeminiPreviewData(`data:image/jpeg;base64,${imageResult.generatedImages[0].image.imageBytes}`);
        } else {
          throw new Error("Nenhuma imagem gerada.");
        }
      } catch (imagenError: any) {
        console.warn("Fallback de SDK: ", imagenError);
        // Fallback usando generateContent para caso o SDK de imagem esteja restrito na tier atual
        // Isso pode não gerar imagens reais, mas evitará que a tela quebre caso o usuário
        // não tenha a flag de Imagen na conta do AI Studio.
        const fallbackResult = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Você é um gerador de prompts. Um usuário tentou gerar uma imagem com Imagen 3 mas a API falhou. O prompt original era: ${finalPrompt}. Descreva em um parágrafo como ficaria essa Action Figure detalhada em português.`
        });
        alert(`O acesso ao gerador de imagens 'Imagen 3' parece não estar habilitado no seu projeto do Google Cloud/AI Studio (Erro 404). \n\nNo entanto, a descrição estrutural que o Gemini gerou foi:\n\n${fallbackResult.text}`);
        setGeminiPreviewData(uploadedPhoto); // Voltar para a foto inicial para não travar a UI
      }
      setIsGeneratingPreview(false);
      setIsGeneratingPreview(false);

    } catch (error) {
      console.error("Erro ao gerar preview com Gemini:", error);
      alert("Erro ao comunicar com Gemini. Verifique no console e a chave da API no .env");
      setIsGeneratingPreview(false);
      // Fallback pra imagem do usuario
      setGeminiPreviewData(uploadedPhoto);
    }
  };

  const reset = () => {
    setView('home');
    setStep('welcome');
    setSubjectType(null);
    setUploadedPhoto(null);
    setSelectedStyle(null);
    setGeminiPreviewData(null);
    setGeminiPrompt("PROMPT_AQUI");
    setCheckoutError(null);
    savePostAuthAction('none');
    clearDraftStorage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      {/* Header Responsivo */}
      <nav className="fixed top-0 w-full z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={reset}>
            <div className="w-10 h-10 bg-funko-blue rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(0,174,239,0.4)] group-hover:scale-110 transition-transform">
              <Box className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-black text-2xl tracking-tighter text-funko-blue drop-shadow-md">
              MINHA FABRICA3D
            </span>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-white/60">
            <button onClick={() => scrollTo(howItWorksRef)} className="hover:text-white transition-colors">Como Funciona</button>
            <button onClick={() => scrollTo(galleryRef)} className="hover:text-white transition-colors">Galeria</button>
            <button onClick={() => scrollTo(pricingRef)} className="hover:text-white transition-colors">Preços</button>
            <button onClick={() => scrollTo(faqRef)} className="hover:text-white transition-colors">Dúvidas</button>
          </div>
          <div className="hidden md:block">
            <button
              onClick={openAccountView}
              disabled={isAuthLoading}
              className="bg-funko-yellow text-[#0A0A0A] px-6 py-2.5 rounded-full text-sm font-black hover:scale-105 transition-transform shadow-[0_0_15px_rgba(255,210,0,0.3)] disabled:opacity-70 disabled:cursor-wait"
            >
              {renderAccountButtonContent()}
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-white p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#141414] border-b border-white/5 overflow-hidden"
            >
              <div className="p-6 flex flex-col gap-6 text-center font-bold text-white/80">
                <button onClick={() => scrollTo(howItWorksRef)}>Como Funciona</button>
                <button onClick={() => scrollTo(galleryRef)}>Galeria</button>
                <button onClick={() => scrollTo(pricingRef)}>Preços</button>
                <button onClick={() => scrollTo(faqRef)}>Dúvidas</button>
                <button
                  onClick={openAccountView}
                  disabled={isAuthLoading}
                  className="bg-funko-yellow text-[#0A0A0A] px-6 py-4 rounded-full text-lg font-black mt-4 disabled:opacity-70 disabled:cursor-wait"
                >
                  {renderAccountButtonContent()}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="pt-32 pb-20 px-6 max-w-6xl mx-auto">
        {/* Progress Bar com Spring Pop */}
        {view === 'home' && step !== 'welcome' && step !== 'success' && (
          <div className="max-w-3xl mx-auto mb-16">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-0 w-full h-1 bg-white/5 -translate-y-1/2 -z-10" />
              <div 
                className="absolute top-1/2 left-0 h-1 bg-funko-blue -translate-y-1/2 -z-10 transition-all duration-700 ease-out" 
                style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%`, boxShadow: '0 0 10px rgba(0,174,239,0.5)' }}
              />
              {steps.map((s, idx) => {
                const isActive = idx === currentStepIndex;
                const isPassed = idx < currentStepIndex;
                return (
                  <div key={s.id} className="flex flex-col items-center gap-2">
                    <motion.div 
                      key={`step-${s.id}-${isActive}`}
                      initial={isActive ? { scale: 0.8 } : { scale: 1 }}
                      animate={isActive ? { scale: 1.2 } : { scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 15 }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-colors duration-300 ${
                        isActive ? 'bg-funko-blue text-white shadow-[0_0_15px_rgba(0,174,239,0.5)]' 
                        : isPassed ? 'bg-funko-blue text-white' 
                        : 'bg-[#141414] border-2 border-white/5 text-white/20'
                      }`}
                    >
                      {isPassed ? <Check className="w-5 h-5" /> : idx + 1}
                    </motion.div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isActive || isPassed ? 'text-funko-blue' : 'text-white/20'}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {view === 'auth' && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto"
            >
              <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 items-stretch">
                <div className="pop-card p-10 md:p-14 flex flex-col justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-funko-blue/10 border border-funko-blue/20 text-funko-blue text-xs font-black tracking-widest uppercase mb-8">
                      <ShieldCheck className="w-3 h-3" />
                      Area do cliente
                    </div>
                    <h2 className="text-5xl md:text-6xl font-display font-black tracking-tight leading-[0.92] mb-6">
                      ENTRE PARA
                      <br />
                      <span className="text-funko-blue">ACOMPANHAR</span>
                      <br />
                      SEUS PEDIDOS
                    </h2>
                    <p className="text-white/55 text-lg md:text-xl font-medium max-w-xl mb-10">
                      Crie sua conta para salvar seu acesso, voltar aos pedidos e acompanhar a producao da sua miniatura sem depender de link solto.
                    </p>
                  </div>

                  <div className="grid gap-4">
                    <div className="pop-card p-5 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-funko-blue/10 text-funko-blue flex items-center justify-center border border-funko-blue/20">
                        <UserRound className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-black text-lg">Conta real para clientes</p>
                        <p className="text-white/45 font-medium">Seu acesso fica ligado ao seu e-mail e salvo com sessao protegida.</p>
                      </div>
                    </div>
                    <div className="pop-card p-5 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-funko-green/10 text-funko-green flex items-center justify-center border border-funko-green/20">
                        <Check className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-black text-lg">Pedidos centralizados</p>
                        <p className="text-white/45 font-medium">A area da conta fica pronta para receber status, revisoes e historico de compra.</p>
                      </div>
                    </div>
                    <div className="pop-card p-5 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-funko-yellow/10 text-funko-yellow flex items-center justify-center border border-funko-yellow/20">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-black text-lg">Fluxo alinhado com o site</p>
                        <p className="text-white/45 font-medium">Entrou, acessou a conta e ja consegue voltar para criar uma nova peca 3D.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pop-card p-8 md:p-10">
                  <div className="flex items-center gap-3 mb-8">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setAuthError(null);
                      }}
                      className={`flex-1 rounded-2xl py-4 font-black transition-colors ${
                        authMode === 'login' ? 'bg-funko-blue text-white shadow-[0_0_20px_rgba(0,174,239,0.25)]' : 'bg-white/5 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      ENTRAR
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register');
                        setAuthError(null);
                      }}
                      className={`flex-1 rounded-2xl py-4 font-black transition-colors ${
                        authMode === 'register' ? 'bg-funko-yellow text-[#0A0A0A] shadow-[0_0_20px_rgba(255,210,0,0.22)]' : 'bg-white/5 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      CRIAR CONTA
                    </button>
                  </div>

                  <form onSubmit={handleAuthSubmit} className="space-y-5">
                    {authMode === 'register' && (
                      <label className="block">
                        <span className="text-xs font-black uppercase tracking-widest text-white/40">Nome completo</span>
                        <div className="mt-2 relative">
                          <UserRound className="w-5 h-5 text-white/25 absolute left-4 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={authForm.name}
                            onChange={(event) => handleAuthFieldChange('name', event.target.value)}
                            className="w-full bg-[#0F0F0F] border border-white/10 rounded-2xl pl-12 pr-4 py-4 font-medium text-white placeholder:text-white/20 focus:outline-none focus:border-funko-blue"
                            placeholder="Seu nome"
                            autoComplete="name"
                          />
                        </div>
                      </label>
                    )}

                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-widest text-white/40">E-mail</span>
                      <div className="mt-2 relative">
                        <Mail className="w-5 h-5 text-white/25 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={authForm.email}
                          onChange={(event) => handleAuthFieldChange('email', event.target.value)}
                          className="w-full bg-[#0F0F0F] border border-white/10 rounded-2xl pl-12 pr-4 py-4 font-medium text-white placeholder:text-white/20 focus:outline-none focus:border-funko-blue"
                          placeholder="voce@email.com"
                          autoComplete="email"
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-widest text-white/40">Senha</span>
                      <div className="mt-2 relative">
                        <Lock className="w-5 h-5 text-white/25 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          value={authForm.password}
                          onChange={(event) => handleAuthFieldChange('password', event.target.value)}
                          className="w-full bg-[#0F0F0F] border border-white/10 rounded-2xl pl-12 pr-4 py-4 font-medium text-white placeholder:text-white/20 focus:outline-none focus:border-funko-blue"
                          placeholder="Sua senha"
                          autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                        />
                      </div>
                    </label>

                    {authMode === 'register' && (
                      <label className="block">
                        <span className="text-xs font-black uppercase tracking-widest text-white/40">Confirmar senha</span>
                        <div className="mt-2 relative">
                          <Lock className="w-5 h-5 text-white/25 absolute left-4 top-1/2 -translate-y-1/2" />
                          <input
                            type="password"
                            value={authForm.confirmPassword}
                            onChange={(event) => handleAuthFieldChange('confirmPassword', event.target.value)}
                            className="w-full bg-[#0F0F0F] border border-white/10 rounded-2xl pl-12 pr-4 py-4 font-medium text-white placeholder:text-white/20 focus:outline-none focus:border-funko-blue"
                            placeholder="Repita a senha"
                            autoComplete="new-password"
                          />
                        </div>
                      </label>
                    )}

                    {authError && (
                      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm font-bold text-red-200">
                        {authError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isAuthSubmitting}
                      className="w-full bg-funko-blue text-white py-5 rounded-[1.5rem] font-black text-lg hover:scale-[1.01] transition-transform shadow-[0_0_25px_rgba(0,174,239,0.35)] disabled:opacity-70 disabled:cursor-wait"
                    >
                      {isAuthSubmitting
                        ? authMode === 'login'
                          ? 'ENTRANDO...'
                          : 'CRIANDO CONTA...'
                        : authMode === 'login'
                          ? 'ENTRAR NA MINHA CONTA'
                          : 'CRIAR MINHA CONTA'}
                    </button>

                    <div className="flex items-center gap-4 pt-2">
                      <div className="h-px flex-1 bg-white/10" />
                      <span className="text-[10px] font-black uppercase tracking-[0.28em] text-white/30">ou</span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isAuthSubmitting}
                      className="w-full bg-white text-[#0A0A0A] py-5 rounded-[1.5rem] font-black text-lg hover:scale-[1.01] transition-transform shadow-[0_0_18px_rgba(255,255,255,0.12)] disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-3"
                    >
                      <span className="w-8 h-8 rounded-full overflow-hidden bg-white flex items-center justify-center">
                        <img src={logoGoogle} alt="Google" className="w-full h-full object-cover" />
                      </span>
                      CONTINUAR COM GOOGLE
                    </button>
                  </form>

                  <div className="mt-8 pt-8 border-t border-white/5 text-center">
                    <p className="text-white/40 font-medium mb-4">
                      Quer voltar para a landing antes de entrar?
                    </p>
                    <button
                      type="button"
                      onClick={goToHome}
                      className="text-funko-blue font-black hover:underline"
                    >
                      VOLTAR PARA O INICIO
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'account' && (
            <motion.div
              key="account"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto"
            >
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-12">
                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-funko-green/10 border border-funko-green/20 text-funko-green text-xs font-black tracking-widest uppercase mb-6">
                    <Check className="w-3 h-3" />
                    Minha conta
                  </div>
                  <h2 className="text-5xl md:text-6xl font-display font-black tracking-tight mb-4">
                    {isAuthLoading ? 'Carregando conta...' : `Bem-vindo, ${firstName}`}
                  </h2>
                  <p className="text-white/55 text-lg max-w-2xl">
                    Aqui o cliente acompanha dados de acesso e, no proximo passo, pedidos, revisoes e andamento de producao.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    type="button"
                    onClick={startCustomizer}
                    className="bg-funko-blue text-white px-8 py-4 rounded-[1.5rem] font-black hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(0,174,239,0.3)]"
                  >
                    CRIAR NOVA PECA
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-[1.5rem] font-black hover:bg-white/10 transition-colors flex items-center justify-center gap-3"
                  >
                    <LogOut className="w-5 h-5" />
                    SAIR
                  </button>
                </div>
              </div>

              {isAuthLoading || shouldShowOAuthProcessing ? (
                <div className="pop-card p-16 text-center">
                  <div className="w-16 h-16 border-8 border-funko-blue border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                  <p className="text-2xl font-black text-funko-blue">
                    {shouldShowOAuthProcessing ? 'Finalizando seu login com Google...' : 'Buscando seus dados...'}
                  </p>
                </div>
              ) : authUser ? (
                <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-8">
                  <div className="pop-card p-8">
                    <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-4">Dados da conta</p>
                    <div className="space-y-6">
                      {authUser.avatarUrl && (
                        <div className="w-24 h-24 rounded-[2rem] overflow-hidden border border-white/10 shadow-xl">
                          <img src={authUser.avatarUrl} alt={authUser.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div>
                        <p className="text-white/40 font-bold text-sm uppercase tracking-widest mb-2">Nome</p>
                        <p className="text-2xl font-black">{authUser.name}</p>
                      </div>
                      <div>
                        <p className="text-white/40 font-bold text-sm uppercase tracking-widest mb-2">E-mail</p>
                        <p className="text-lg font-bold text-white/75 break-all">{authUser.email}</p>
                      </div>
                      <div>
                        <p className="text-white/40 font-bold text-sm uppercase tracking-widest mb-2">Conta criada em</p>
                        <p className="text-lg font-bold text-white/75">
                          {new Date(authUser.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/40 font-bold text-sm uppercase tracking-widest mb-2">Metodo de acesso</p>
                        <p className="text-lg font-bold text-white/75 uppercase">{authUser.provider || 'email'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pop-card p-8">
                    <div className="flex items-center justify-between gap-4 mb-8">
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-2">Pedidos</p>
                        <h3 className="text-3xl font-black">Seu painel esta pronto</h3>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-funko-blue/10 text-funko-blue flex items-center justify-center border border-funko-blue/20">
                        <Box className="w-7 h-7" />
                      </div>
                    </div>

                    {isOrdersLoading ? (
                      <div className="rounded-[2rem] border border-dashed border-white/10 bg-[#101010] p-8 text-center">
                        <div className="w-14 h-14 border-8 border-funko-blue border-t-transparent rounded-full animate-spin mx-auto mb-5" />
                        <p className="text-white/65 text-lg font-medium">Carregando pedidos salvos no Supabase...</p>
                      </div>
                    ) : ordersError ? (
                      <div className="rounded-[2rem] border border-red-500/20 bg-red-500/10 p-6">
                        <p className="font-black text-red-200 mb-2">Nao foi possivel carregar seus pedidos.</p>
                        <p className="text-red-100/80 font-medium">{ordersError}</p>
                      </div>
                    ) : orders.length > 0 ? (
                      <div className="grid sm:grid-cols-2 gap-5">
                        {orders.map((order) => (
                          <div key={order.id} className="rounded-[2rem] border border-white/10 bg-[#101010] overflow-hidden">
                            <div className="aspect-square bg-[#0B0B0B]">
                              {order.previewImageUrl ? (
                                <img src={order.previewImageUrl} alt={`Pedido ${order.id}`} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/25 font-black">
                                  PREVIA INDISPONIVEL
                                </div>
                              )}
                            </div>
                            <div className="p-5">
                              <div className="flex items-center justify-between gap-4 mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-funko-blue">
                                  {order.subjectType === 'person' ? 'Pessoa' : 'Pet'}
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/35">
                                  {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                              <h4 className="text-xl font-black mb-2">{order.styleName || 'Roupa Aleatoria'}</h4>
                              <p className="text-white/45 font-bold text-sm mb-4 uppercase tracking-widest">
                                Status: {order.status}
                              </p>
                              <p className="text-white/70 font-black">R$ {order.totalAmount.toFixed(2).replace('.', ',')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[2rem] border border-dashed border-white/10 bg-[#101010] p-8">
                        <p className="text-white/65 text-lg font-medium mb-4">
                          Ainda nao existem pedidos ligados a esta conta.
                        </p>
                        <p className="text-white/35 font-bold mb-8">
                          Quando voce finalizar um pedido, a previa e os dados ficam salvos no Supabase e aparecem aqui.
                        </p>
                        <button
                          type="button"
                          onClick={startCustomizer}
                          className="bg-funko-yellow text-[#0A0A0A] px-8 py-4 rounded-[1.5rem] font-black hover:scale-[1.02] transition-transform shadow-[0_0_18px_rgba(255,210,0,0.22)]"
                        >
                          CRIAR MINHA PRIMEIRA PECA
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="pop-card p-16 text-center">
                  <p className="text-2xl font-black mb-4">Sua sessao terminou.</p>
                  <p className="text-white/45 font-medium mb-8">Entre novamente para acessar sua conta.</p>
                  <button
                    type="button"
                    onClick={() => openAuthView('login')}
                    className="bg-funko-blue text-white px-10 py-4 rounded-[1.5rem] font-black hover:scale-[1.02] transition-transform"
                  >
                    ENTRAR DE NOVO
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {view === 'home' && step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="grid grid-cols-1 lg:grid-cols-[1.02fr_0.98fr] gap-12 items-center text-left">
                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-funko-blue/10 border border-funko-blue/20 text-funko-blue text-xs font-black tracking-widest uppercase mb-8 shadow-sm">
                    <Sparkles className="w-3 h-3" />
                    Sua historia em tres dimensoes
                  </div>
                  <h1 className="text-6xl md:text-8xl font-display font-black tracking-tighter leading-[0.85] mb-8 text-white">
                    TRANSFORME <br />
                    <span className="text-funko-blue drop-shadow-lg">SUA FOTO EM</span> <br />
                    MINIATURAS 3D!
                  </h1>
                  <p className="text-white/60 text-xl max-w-xl mb-12 font-medium">
                    Transformamos suas fotos favoritas em pecas 3D exclusivas. Pessoas, familias e pets moldados digitalmente e materializados para voce.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mb-12">
                    <div className="pop-card p-5">
                      <p className="text-xs font-black uppercase tracking-widest text-funko-blue mb-2">Produtos em destaque</p>
                      <p className="text-white/65 font-bold">Kit Minha Arte e Mini Realismo como primeiras linhas da marca.</p>
                    </div>
                    <div className="pop-card p-5">
                      <p className="text-xs font-black uppercase tracking-widest text-funko-yellow mb-2">Memoria afetiva</p>
                      <p className="text-white/65 font-bold">Presenteie com uma lembranca tridimensional feita a partir de uma foto real.</p>
                    </div>
                    <div className="pop-card p-5">
                      <p className="text-xs font-black uppercase tracking-widest text-funko-green mb-2">Pessoas, pets e familia</p>
                      <p className="text-white/65 font-bold">Comece por um personagem e evolua para casal, familia e cenarios tematicos.</p>
                    </div>
                    <div className="pop-card p-5">
                      <p className="text-xs font-black uppercase tracking-widest text-funko-blue mb-2">Processo autoral</p>
                      <p className="text-white/65 font-bold">Modelagem digital, producao 3D e acabamento pensados para emocionar.</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <button 
                      onClick={() => setStep('type')}
                      className="w-full sm:w-auto bg-funko-blue text-white px-12 py-6 rounded-[2rem] text-xl font-black flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-[0_0_30px_rgba(0,174,239,0.4)] animate-shimmer"
                    >
                      CRIAR MINHA MINIATURA <ArrowRight className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={() => scrollTo(galleryRef)}
                      className="w-full sm:w-auto bg-[#141414] border-2 border-white/5 px-12 py-6 rounded-[2rem] text-xl font-black hover:bg-white/5 transition-colors text-white/80"
                    >
                      CONHECER FORMATOS
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute -inset-10 bg-funko-blue/20 rounded-[3rem] blur-3xl -z-10 animate-pulse" />
                  <div className="absolute top-4 -left-4 z-10 pop-card px-5 py-4 bg-[#0F1316]/90">
                    <p className="text-xs font-black uppercase tracking-widest text-funko-green mb-1">Linha inicial</p>
                    <p className="text-2xl font-black text-white">R$ 149,90</p>
                  </div>
                  <div className="border border-white/10 rounded-[2rem] p-4 bg-[#141414]/50 backdrop-blur-md rotate-3 hover:rotate-0 transition-transform duration-700 shadow-2xl">
                    <img 
                      src={heroBonecoExample}
                      alt="Exemplo de miniatura 3D personalizada" 
                      className="rounded-[1.5rem] w-full object-contain aspect-[4/5] bg-[#D8C7AF] shadow-2xl opacity-90 hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute -bottom-6 -left-6 bg-funko-yellow text-[#0A0A0A] p-6 rounded-3xl shadow-xl -rotate-6 font-black text-lg">
                      PESSOAS • PETS • FAMILIAS
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-16 text-left">
                <div className="text-center mb-10">
                  <h2 className="text-4xl font-display font-black mb-3">Nossos produtos principais</h2>
                  <p className="text-white/40 text-base font-bold uppercase tracking-widest">Duas formas de viver sua miniatura</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="pop-card p-10 border-funko-yellow/20">
                    <div className="w-16 h-16 rounded-3xl bg-funko-yellow/10 border border-funko-yellow/20 text-funko-yellow flex items-center justify-center mb-8">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-funko-yellow mb-3">Kit Minha Arte</p>
                    <h3 className="text-4xl font-black mb-4">Boneco caricato para pintar</h3>
                    <p className="text-white/55 font-medium text-lg mb-8">
                      Uma experiencia de criatividade, terapia e lazer. Voce recebe a miniatura personalizada pronta para ganhar vida com suas proprias cores.
                    </p>
                    <ul className="space-y-4 text-white/70 font-bold mb-8">
                      <li className="flex items-center gap-3"><Check className="w-5 h-5 text-funko-green" /> Boneco personalizado em base neutra</li>
                      <li className="flex items-center gap-3"><Check className="w-5 h-5 text-funko-green" /> Kit de tintas selecionadas</li>
                      <li className="flex items-center gap-3"><Check className="w-5 h-5 text-funko-green" /> Pinceis para pintar em casa</li>
                    </ul>
                    <p className="text-white/35 font-bold">Ideal para relaxar, presentear e criar uma atividade inesquecivel com as criancas.</p>
                  </div>
                  <div className="pop-card p-10 border-funko-blue/20 bg-funko-blue/5">
                    <div className="w-16 h-16 rounded-3xl bg-funko-blue/10 border border-funko-blue/20 text-funko-blue flex items-center justify-center mb-8">
                      <Box className="w-8 h-8" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-funko-blue mb-3">Mini Realismo</p>
                    <h3 className="text-4xl font-black mb-4">Peca colorida e pronta</h3>
                    <p className="text-white/55 font-medium text-lg mb-8">
                      A linha para decoracao e memoria afetiva. Miniaturas prontas para encantar em casa, no escritorio ou como presente premium.
                    </p>
                    <ul className="space-y-4 text-white/70 font-bold mb-8">
                      <li className="flex items-center gap-3"><Check className="w-5 h-5 text-funko-green" /> Formato de ima de geladeira</li>
                      <li className="flex items-center gap-3"><Check className="w-5 h-5 text-funko-green" /> Opcao de quadro 3D decorativo</li>
                      <li className="flex items-center gap-3"><Check className="w-5 h-5 text-funko-green" /> Cenario tematico como adicional futuro</li>
                    </ul>
                    <p className="text-white/35 font-bold">Perfeito para lembrancas afetivas e composicoes com profundidade e personalidade.</p>
                  </div>
                </div>
              </div>

              {/* Reveal Animations On Scroll para as Secões */}
              <motion.div 
                ref={howItWorksRef} 
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="mt-40 pt-20 border-t border-white/5"
              >
                <div className="text-center mb-20">
                  <h2 className="text-5xl font-display font-black mb-4">Como funciona</h2>
                  <p className="text-white/40 text-lg font-bold uppercase tracking-widest">Foto, modelagem digital, producao e envio</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  <div className="pop-card p-12 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-funko-blue/20 rounded-3xl flex items-center justify-center text-funko-blue mb-8 shadow-xl rotate-3 border border-funko-blue/30">
                      <Camera className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-black mb-4">1. Envie sua foto</h3>
                    <p className="text-white/60 font-medium leading-relaxed">
                      Carregue a melhor foto da pessoa, familia ou pet que voce quer transformar em miniatura.
                    </p>
                  </div>
                  <div className="pop-card p-12 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-funko-yellow/20 rounded-3xl flex items-center justify-center text-funko-yellow mb-8 shadow-xl -rotate-3 border border-funko-yellow/30">
                      <Sparkles className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-black mb-4">2. Modelagem digital</h3>
                    <p className="text-white/60 font-medium leading-relaxed">
                      Nossa equipe e a IA constroem a base 3D respeitando tracos, proporcoes e estilo do produto escolhido.
                    </p>
                  </div>
                  <div className="pop-card p-12 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-funko-green/20 rounded-3xl flex items-center justify-center text-funko-green mb-8 shadow-xl rotate-6 border border-funko-green/30">
                      <Box className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-black mb-4">3. Producao e envio</h3>
                    <p className="text-white/60 font-medium leading-relaxed">
                      Imprimimos, finalizamos e enviamos sua peca para decorar, presentear ou marcar um momento especial.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Showcase Grid */}
              <motion.div 
                ref={galleryRef} 
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="mt-40 pt-20 border-t border-white/5"
              >
                <div className="text-center mb-20">
                  <h2 className="text-5xl font-display font-black mb-4">Ideias para inspirar seu pedido</h2>
                  <p className="text-white/40 text-lg font-bold uppercase tracking-widest">Hoje com pessoa e pet. Casal e familia chegam em breve.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {SHOWCASE.map((item) => (
                  <div key={item.id} className="group pop-card overflow-hidden cursor-pointer">
                    <div className="aspect-square overflow-hidden bg-[#1A1A1A]">
                      <img 
                        src={item.imageUrl} 
                        alt={item.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-8 text-left border-t border-white/5 bg-[#141414]">
                      <div className="text-xs font-black uppercase tracking-widest text-funko-blue mb-2">
                        {item.type === 'person' ? 'Pessoa' : 'Pet'}
                      </div>
                      <h3 className="text-xl font-black text-white/90">{item.title}</h3>
                    </div>
                  </div>
                ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="mt-40 pt-20 border-t border-white/5"
              >
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 items-stretch">
                  <div className="pop-card p-12 text-left border-funko-yellow/20">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-funko-yellow/10 border border-funko-yellow/20 text-funko-yellow text-xs font-black tracking-widest uppercase mb-8">
                      <Dog className="w-3 h-3" />
                      Destaque pet
                    </div>
                    <h2 className="text-5xl font-display font-black mb-6">Eternize seu melhor amigo</h2>
                    <p className="text-white/55 text-xl font-medium mb-10">
                      O mercado pet e um dos mais emocionais e fortes para esse tipo de produto. Uma miniatura bem feita do seu companheiro vira lembranca, presente e decoracao ao mesmo tempo.
                    </p>
                    <div className="space-y-5">
                      <div className="pop-card p-5">
                        <p className="text-xs font-black uppercase tracking-widest text-funko-yellow mb-2">Alta conversao</p>
                        <p className="text-white/65 font-bold">Pets geram apelo imediato porque a compra mistura afeto, saudade e presente.</p>
                      </div>
                      <div className="pop-card p-5">
                        <p className="text-xs font-black uppercase tracking-widest text-funko-green mb-2">Linha propria</p>
                        <p className="text-white/65 font-bold">Vale ter uma secao exclusiva para pet com exemplos, depoimentos e chamadas afetivas.</p>
                      </div>
                      <div className="pop-card p-5">
                        <p className="text-xs font-black uppercase tracking-widest text-funko-blue mb-2">Frase forte</p>
                        <p className="text-white/65 font-bold">Use algo como: "Eternize seu melhor amigo em uma miniatura 3D cheia de personalidade."</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-8">
                    <div className="pop-card p-10 text-left">
                      <p className="text-xs font-black uppercase tracking-widest text-funko-blue mb-3">Upgrade de cenario</p>
                      <h3 className="text-3xl font-black mb-4">Venda um mundo junto da miniatura</h3>
                      <p className="text-white/55 font-medium mb-6">
                        No Mini Realismo, o cenario tematico pode virar um adicional poderoso no carrinho: praia, castelo, escritorio, quarto infantil ou viagem inesquecivel.
                      </p>
                      <p className="text-white/35 font-bold">Isso aumenta ticket medio e torna a lembranca muito mais exclusiva.</p>
                    </div>
                    <div className="pop-card p-10 text-left">
                      <p className="text-xs font-black uppercase tracking-widest text-funko-green mb-3">Videos de processo</p>
                      <h3 className="text-3xl font-black mb-4">Mostre a modelagem em timelapse</h3>
                      <p className="text-white/55 font-medium mb-6">
                        Como o produto nasce de uma modelagem 3D, mostrar o processo gera autoridade e prova que a peca nao e um item generico de catalogo.
                      </p>
                      <p className="text-white/35 font-bold">Video curto de foto para boneco aumenta confianca e valor percebido.</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="mt-40 pt-20 border-t border-white/5"
              >
                <div className="text-center mb-20">
                  <h2 className="text-5xl font-display font-black mb-4">Solucoes para eventos</h2>
                  <p className="text-white/40 text-lg font-bold uppercase tracking-widest">Do presente individual ao encantamento de convidados</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="pop-card p-10 text-left">
                    <p className="text-xs font-black uppercase tracking-widest text-funko-blue mb-3">Casamentos</p>
                    <h3 className="text-3xl font-black mb-4">Topo de bolo e lembrancinhas</h3>
                    <p className="text-white/55 font-medium">Noivinhos personalizados, mini-imas e pecas especiais para marcar a data com personalidade.</p>
                  </div>
                  <div className="pop-card p-10 text-left">
                    <p className="text-xs font-black uppercase tracking-widest text-funko-yellow mb-3">Nascimentos</p>
                    <h3 className="text-3xl font-black mb-4">Quadros 3D afetivos</h3>
                    <p className="text-white/55 font-medium">Miniaturas decorativas com o bebe e os dados do nascimento para eternizar o momento.</p>
                  </div>
                  <div className="pop-card p-10 text-left">
                    <p className="text-xs font-black uppercase tracking-widest text-funko-green mb-3">Corporativo</p>
                    <h3 className="text-3xl font-black mb-4">Brindes memoraveis</h3>
                    <p className="text-white/55 font-medium">Caricaturas e miniaturas para premiacao, reconhecimento e acoes especiais com colaboradores.</p>
                  </div>
                </div>
              </motion.div>

              {/* Planos */}
              <motion.div 
                ref={pricingRef} 
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="mt-40 pt-20 border-t border-white/5"
              >
                <div className="text-center mb-20">
                  <h2 className="text-5xl font-display font-black mb-4">Escolha o produto ideal</h2>
                  <p className="text-white/40 text-lg font-bold uppercase tracking-widest">Criatividade para pintar ou miniatura pronta para decorar</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  <div className="pop-card p-12">
                    <h3 className="text-3xl font-black mb-2">Kit Minha Arte</h3>
                    <div className="text-5xl font-black text-white mb-8">R$ 149,90</div>
                    <ul className="space-y-4 mb-12 text-white/60 font-bold">
                      <li className="flex items-center gap-3"><Check className="w-5 h-5 text-funko-green" /> Boneco caricato em base neutra</li>
                      <li className="flex items-center gap-3"><Check className="w-5 h-5 text-funko-green" /> Kit de tintas selecionadas</li>
                      <li className="flex items-center gap-3"><Check className="w-5 h-5 text-funko-green" /> Pinceis para a experiencia em casa</li>
                    </ul>
                    <button onClick={() => setStep('type')} className="w-full py-5 bg-white/5 rounded-2xl font-black text-lg hover:bg-white/10 transition-colors text-white">QUERO MEU KIT</button>
                  </div>
                  <div className="pop-card p-12 border-funko-blue/50 bg-funko-blue/5 relative overflow-hidden">
                    <div className="absolute top-8 right-8 bg-funko-blue text-white text-xs font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-[0_0_15px_rgba(0,174,239,0.5)]">POPULAR</div>
                    <h3 className="text-3xl font-black mb-2">Mini Realismo</h3>
                    <div className="text-5xl font-black text-funko-blue mb-8 drop-shadow-md">R$ 179,80</div>
                    <ul className="space-y-4 mb-12 text-white/60 font-bold">
                      <li className="flex items-center gap-3"><Check className="w-5 h-5 text-funko-green" /> Miniatura colorida e pronta</li>
                      <li className="flex items-center gap-3"><Check className="w-5 h-5 text-funko-green" /> Formatos de ima e quadro 3D</li>
                      <li className="flex items-center gap-3"><Check className="w-5 h-5 text-funko-green" /> Cenario tematico como adicional futuro</li>
                    </ul>
                    <button onClick={() => setStep('type')} className="w-full py-5 bg-funko-blue text-white rounded-2xl font-black text-lg hover:scale-105 transition-transform shadow-[0_4px_15px_rgba(0,174,239,0.3)]">QUERO O MINI REALISMO</button>
                  </div>
                </div>
                <div className="pop-card p-8 max-w-4xl mx-auto mt-8 text-left">
                  <p className="text-xs font-black uppercase tracking-widest text-funko-yellow mb-3">Em breve</p>
                  <p className="text-white/70 font-bold">Vamos liberar modulos para casal, familia, cenarios tematicos e composicoes com mais de um personagem no mesmo pedido.</p>
                </div>
              </motion.div>

              <motion.div
                ref={faqRef}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="mt-40 pt-20 border-t border-white/5"
              >
                <div className="text-center mb-20">
                  <h2 className="text-5xl font-display font-black mb-4">Duvidas frequentes</h2>
                  <p className="text-white/40 text-lg font-bold uppercase tracking-widest">As respostas que ajudam o cliente a entender o produto e comprar com seguranca</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="pop-card p-10 text-left">
                    <h3 className="text-2xl font-black mb-4">Vocês fazem apenas ima de geladeira?</h3>
                    <p className="text-white/55 font-medium leading-relaxed">Nao. O Mini Realismo abre caminho para formatos como ima de geladeira, quadro 3D e, futuramente, cenarios tematicos.</p>
                  </div>
                  <div className="pop-card p-10 text-left">
                    <h3 className="text-2xl font-black mb-4">O Kit Minha Arte vem pronto?</h3>
                    <p className="text-white/55 font-medium leading-relaxed">Ele vem com a miniatura personalizada em base neutra, tintas e pinceis para a experiencia de pintura em casa.</p>
                  </div>
                  <div className="pop-card p-10 text-left">
                    <h3 className="text-2xl font-black mb-4">Posso fazer de pet?</h3>
                    <p className="text-white/55 font-medium leading-relaxed">Sim. Pets sao uma das linhas mais fortes da marca e merecem destaque proprio pela carga emocional e potencial de conversao.</p>
                  </div>
                  <div className="pop-card p-10 text-left">
                    <h3 className="text-2xl font-black mb-4">Vocês atendem eventos e empresas?</h3>
                    <p className="text-white/55 font-medium leading-relaxed">Sim. A estrutura da marca ja contempla casamentos, nascimentos e brindes corporativos como frente B2B e social.</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {view === 'home' && step === 'type' && (
            <motion.div
              key="type"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-3xl mx-auto"
            >
              <button onClick={() => setStep('welcome')} className="flex items-center gap-2 text-white/40 hover:text-white mb-12 font-black transition-colors">
                <ChevronLeft className="w-5 h-5" /> VOLTAR
              </button>
              <h2 className="text-5xl font-display font-black tracking-tight mb-4">Quem vamos transformar em 3D?</h2>
              <p className="text-white/40 text-xl font-medium mb-12">Escolha quem vai virar uma peca personalizada da Minha Fabrica3D.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <button 
                  onClick={() => { setSubjectType('person'); setStep('upload'); }}
                  className="group pop-card p-12 text-left hover:border-funko-blue"
                >
                  <div className="w-20 h-20 bg-funko-blue/10 rounded-3xl flex items-center justify-center mb-8 border border-funko-blue/20 group-hover:bg-funko-blue group-hover:text-white transition-all text-funko-blue">
                    <User className="w-10 h-10" />
                  </div>
                  <h3 className="text-3xl font-black mb-3">Pessoa</h3>
                  <p className="text-white/40 font-bold">Seu rosto ou de alguem especial em uma miniatura 3D personalizada.</p>
                </button>
                <button 
                  onClick={() => { setSubjectType('pet'); setStep('upload'); }}
                  className="group pop-card p-12 text-left hover:border-funko-yellow"
                >
                  <div className="w-20 h-20 bg-funko-yellow/10 rounded-3xl flex items-center justify-center mb-8 border border-funko-yellow/20 group-hover:bg-funko-yellow group-hover:text-[#0A0A0A] transition-all text-funko-yellow">
                    <Dog className="w-10 h-10" />
                  </div>
                  <h3 className="text-3xl font-black mb-3">Pet</h3>
                  <p className="text-white/40 font-bold">Seu pet transformado em uma miniatura 3D cheia de personalidade.</p>
                </button>
              </div>
            </motion.div>
          )}

          {view === 'home' && step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-3xl mx-auto text-center"
            >
              <button onClick={() => setStep('type')} className="flex items-center gap-2 text-white/40 hover:text-white mb-12 font-black transition-colors mx-auto">
                <ChevronLeft className="w-5 h-5" /> VOLTAR
              </button>
              <h2 className="text-5xl font-display font-black tracking-tight mb-4">Envie sua foto de referencia</h2>
              <p className="text-white/40 text-xl font-medium mb-12">
                Use uma foto bem iluminada para o Gemini entender seu rosto, seu pet e a base da sua miniatura.
              </p>

              <div 
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`pop-card border-4 border-dashed rounded-[3rem] p-24 transition-all cursor-[pointer] relative ${
                  isUploading ? 'border-funko-blue cyber-scan bg-funko-blue/5' : 'border-white/10 hover:border-funko-blue/50'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoUpload} 
                  className="hidden" 
                  accept="image/*"
                />
                
                {isUploading ? (
                  <div className="flex flex-col items-center relative z-20">
                    <div className="w-16 h-16 border-8 border-funko-blue border-t-transparent rounded-full animate-spin mb-6 drop-shadow-[0_0_10px_rgba(0,174,239,0.8)]"></div>
                    <p className="text-2xl font-black text-funko-blue">Analisando traços...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center relative z-20">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/10">
                      <Camera className="w-12 h-12 text-white/50" />
                    </div>
                    <p className="text-3xl font-black mb-4">Clique para enviar</p>
                    <p className="text-white/40 font-bold">ou arraste a foto aqui</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'home' && step === 'style' && (
            <motion.div
              key="style"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8">
                <div>
                  <h2 className="text-5xl font-display font-black tracking-tight mb-4">Escolha o estilo da sua miniatura</h2>
                  <p className="text-white/40 text-xl font-medium">Como o personagem da sua peca 3D deve se vestir?</p>
                </div>
                <div className="flex items-center gap-6 pop-card p-4">
                  <div className="w-20 h-20 rounded-2xl border-4 border-funko-blue overflow-hidden shadow-[0_0_15px_rgba(0,174,239,0.3)]">
                    <img src={uploadedPhoto!} alt="Sua foto" className="w-full h-full object-cover" />
                  </div>
                  <button onClick={() => setStep('upload')} className="text-sm font-black text-funko-blue hover:underline">TROCAR</button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {/* Random Style Option */}
                <button 
                  onClick={() => { 
                    setSelectedStyle(null);
                    setStep('preview');
                    generateGeminiPreview();
                  }}
                  className={`group pop-card p-10 text-left flex flex-col justify-between hover:border-funko-blue/50`}
                >
                  <div>
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-funko-blue group-hover:text-white transition-all">
                      <Shirt className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-black mb-3">Estilo Aleatório</h3>
                    <p className="text-white/40 font-bold">Nós escolhemos um visual!</p>
                  </div>
                </button>

                {BODY_STYLES.map((style) => (
                  <button 
                    key={style.id}
                    onClick={() => {
                      setSelectedStyle(style);
                      setStep('preview');
                      generateGeminiPreview();
                    }}
                    className={`group pop-card overflow-hidden text-left relative hover:border-funko-blue/50`}
                  >
                    <div className="aspect-square relative overflow-hidden bg-[#0A0A0A]">
                      <img src={style.imageUrl} alt={style.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" loading="lazy" />
                      <div className="absolute top-4 right-4 bg-[#0A0A0A]/80 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 text-white">
                        {style.category}
                      </div>
                    </div>
                    <div className="p-8 border-t border-white/5 bg-[#141414]">
                      <h3 className="text-xl font-black mb-2">{style.name}</h3>
                      <p className="text-white/40 font-bold text-sm leading-tight">{style.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'home' && step === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto text-center"
            >
              <h2 className="text-5xl font-display font-black tracking-tight mb-4 flex items-center justify-center gap-4">
                <Wand2 className="w-12 h-12 text-funko-blue" />
                Previa da sua miniatura
              </h2>
              <p className="text-white/40 text-xl font-medium mb-12">
                O Gemini esta analisando seus tracos e modelando a previa da sua peca...
              </p>

              <div className="pop-card p-12 text-left mb-12">
                {!geminiPreviewData || isGeneratingPreview ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-8">
                    <div className="w-20 h-20 border-8 border-funko-blue border-t-white rounded-full animate-spin shadow-[0_0_15px_rgba(0,174,239,0.5)]"></div>
                    <p className="text-2xl font-black animate-pulse text-funko-blue">O Gemini esta desenhando sua previa (isso pode levar uns 15 segundos)...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <h3 className="text-3xl font-black mb-8 text-funko-green">Pronto! Veja como sua miniatura pode ficar:</h3>
                    <div className="aspect-[3/4] w-full max-w-sm rounded-[2rem] overflow-hidden border-4 border-white/20 shadow-2xl relative bg-[#D8C7AF]">
                      <img src={geminiPreviewData} alt="Preview do Gemini" className="w-full h-full object-contain" />
                      <div className="absolute top-4 left-4 bg-funko-blue/90 backdrop-blur text-white text-xs font-black px-4 py-2 rounded-full uppercase">
                        AI GENERATED
                      </div>
                    </div>
                    <div className="mt-8 flex gap-4 w-full justify-center">
                      <button 
                        onClick={generateGeminiPreview}
                        className="bg-white/10 text-white px-8 py-4 rounded-full font-black text-sm hover:bg-white/20 transition-colors"
                      >
                        GERAR OUTRA VEZ
                      </button>
                      <button 
                        onClick={() => setStep('review')}
                        className="bg-funko-green text-white px-12 py-4 rounded-full font-black text-lg hover:scale-105 transition-transform shadow-[0_0_20px_rgba(76,203,40,0.4)]"
                      >
                        EU ADOREI, CONTINUAR
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'home' && step === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-5xl mx-auto"
            >
              <h2 className="text-5xl font-display font-black tracking-tight mb-16 text-center">Resumo da sua peca 3D</h2>
              
              <div className="pop-card overflow-hidden border-funko-blue/30 shadow-[0_10px_40px_rgba(0,174,239,0.1)]">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="p-12 border-b md:border-b-0 md:border-r border-white/5 bg-[#1A1A1A]">
                    <div className="aspect-[3/4] rounded-[2rem] overflow-hidden border-4 border-white/10 shadow-2xl mb-10 relative bg-[#D8C7AF]">
                       {/* Mostrar o Preview do Gemini se existir, ou a foto original */}
                      <img src={geminiPreviewData || uploadedPhoto!} alt="Referência" className="w-full h-full object-contain opacity-90 hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-funko-green/20 rounded-2xl flex items-center justify-center text-funko-green border border-funko-green/30">
                        <Check className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-white/40">Status do Envio</p>
                        <p className="text-xl font-black">Pronto para producao</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-12 flex flex-col justify-between">
                    <div>
                      <div className="mb-12">
                        <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-4">Estilo Escolhido</p>
                        <div className="flex items-center gap-6">
                          <div className="w-24 h-24 bg-[#0A0A0A] rounded-3xl flex items-center justify-center border-2 border-white/5 shadow-lg overflow-hidden">
                            {selectedStyle ? <img src={selectedStyle.imageUrl} className="w-full h-full object-cover opacity-90" /> : <Shirt className="w-10 h-10 text-white/20" />}
                          </div>
                          <div>
                            <h3 className="text-3xl font-black">{selectedStyle?.name || 'Roupa Aleatória'}</h3>
                            <p className="text-white/40 font-bold text-lg">{selectedStyle?.category || 'Surpresa'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6 mb-12">
                        <div className="flex justify-between text-white/60 font-bold text-lg">
                          <span>Peca 3D personalizada</span>
                          <span>R$ 149,90</span>
                        </div>
                        <div className="flex justify-between text-white/60 font-bold text-lg">
                          <span>Estilo Premium</span>
                          <span>{selectedStyle ? 'R$ 29,90' : 'Grátis'}</span>
                        </div>
                        <div className="flex justify-between text-white/60 font-bold text-lg">
                          <span>Frete</span>
                          <span className="text-funko-green drop-shadow-[0_0_5px_rgba(76,203,40,0.5)]">Grátis</span>
                        </div>
                        <div className="pt-8 border-t-2 border-dashed border-white/10 flex justify-between text-4xl font-display font-black">
                          <span>TOTAL</span>
                          <span className="text-funko-blue">R$ {selectedStyle ? '179,80' : '149,90'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-6">
                      {!authUser && (
                        <div className="rounded-2xl border border-funko-yellow/20 bg-funko-yellow/10 px-5 py-4 text-sm font-bold text-funko-yellow">
                          Entre na sua conta para salvar o pedido, a previa da peca e a imagem de referencia no Supabase.
                        </div>
                      )}

                      {checkoutError && (
                        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-200">
                          {checkoutError}
                        </div>
                      )}

                      <button 
                        onClick={handleFinalizeOrder}
                        disabled={isSavingOrder}
                        className="w-full bg-funko-blue text-white py-6 rounded-[2rem] font-black text-2xl hover:scale-[1.02] transition-transform shadow-[0_0_30px_rgba(0,174,239,0.4)] animate-shimmer disabled:opacity-70 disabled:cursor-wait"
                      >
                        {isSavingOrder
                          ? 'SALVANDO NO SUPABASE...'
                          : authUser
                            ? 'FINALIZAR PEDIDO'
                            : 'ENTRAR PARA FINALIZAR'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'home' && step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto text-center mt-20"
            >
              <div className="w-32 h-32 bg-funko-green/20 rounded-full flex items-center justify-center mx-auto mb-10 shadow-[0_0_50px_rgba(76,203,40,0.6)] animate-border border-4 border-funko-green">
                <Check className="w-16 h-16 text-funko-green drop-shadow-lg" />
              </div>
              <h2 className="text-6xl font-display font-black tracking-tight mb-8">Pedido Recebido!</h2>
              <p className="text-white/60 text-2xl font-medium mb-16">
                Seu pedido e as imagens ficaram salvos na sua conta. Agora nossa equipe pode seguir com a sua miniatura.
              </p>
              <div className="pop-card p-12 text-left mb-16 border-funko-green/30">
                <div className="flex items-center gap-6 mb-10">
                  <div className="w-14 h-14 bg-funko-blue rounded-2xl flex items-center justify-center text-white shadow-[0_0_15px_rgba(0,174,239,0.5)]">
                    <Info className="w-7 h-7" />
                  </div>
                  <h4 className="text-2xl font-black">Próximos Passos</h4>
                </div>
                <ul className="space-y-6 text-lg font-bold text-white/60">
                  <li className="flex gap-4">
                    <span className="text-funko-blue font-black">01.</span>
                    Modelagem 3D baseada na prévia AI (24-48h).
                  </li>
                  <li className="flex gap-4">
                    <span className="text-funko-blue font-black">02.</span>
                    Impressão em resina 12K de alta definição.
                  </li>
                  <li className="flex gap-4">
                    <span className="text-funko-blue font-black">03.</span>
                    Pintura artesanal e envio expresso.
                  </li>
                </ul>
              </div>
              <button 
                onClick={reset}
                className="bg-white text-[#0A0A0A] px-16 py-6 rounded-[2rem] font-black text-2xl hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                VOLTAR AO INÍCIO
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* WhatsApp Button + Padding para o footer mobile */}
      <a 
        href="https://wa.me/5500000000000" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-24 md:bottom-8 right-6 md:right-8 z-50 bg-[#25D366] text-white p-5 rounded-full shadow-[0_0_20px_rgba(37,211,102,0.4)] hover:scale-110 transition-transform flex items-center justify-center group"
      >
        <MessageCircle className="w-8 h-8" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-3 transition-all duration-500 font-black whitespace-nowrap">
          FALAR NO WHATSAPP
        </span>
      </a>

      {/* Footer */}
      <footer className="border-t border-white/5 py-20 mt-40 bg-[#141414]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-funko-blue rounded-xl flex items-center justify-center text-white shadow-[0_0_15px_rgba(0,174,239,0.3)]">
                  <Box className="w-6 h-6" />
                </div>
                <span className="font-display font-black text-3xl tracking-tighter text-funko-blue drop-shadow-md">MINHA FABRICA3D</span>
              </div>
              <p className="text-white/40 font-bold max-w-sm">
                Transformamos fotos em miniaturas 3D personalizadas para presente, decoracao, memoria afetiva e eventos especiais.
              </p>
            </div>
            <div>
              <h4 className="font-black mb-6 uppercase tracking-widest text-xs text-white/40">Links Úteis</h4>
              <ul className="space-y-4 font-bold text-white/60">
                <li><button onClick={() => scrollTo(howItWorksRef)} className="hover:text-funko-blue transition-colors">Como Funciona</button></li>
                <li><button onClick={() => scrollTo(galleryRef)} className="hover:text-funko-blue transition-colors">Galeria</button></li>
                <li><button onClick={() => scrollTo(pricingRef)} className="hover:text-funko-blue transition-colors">Preços</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black mb-6 uppercase tracking-widest text-xs text-white/40">Garantias</h4>
              <ul className="space-y-4 font-bold text-white/60">
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-funko-green" /> Qualidade Premium</li>
                <li className="flex items-center gap-2"><Truck className="w-4 h-4 text-funko-blue" /> Envio Seguro</li>
                <li className="flex items-center gap-2"><Clock className="w-4 h-4 text-funko-yellow" /> Entrega no Prazo</li>
              </ul>
            </div>
          </div>
          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-sm text-white/20 font-black tracking-widest uppercase text-center md:text-left">
              &copy; 2026 MINHA FABRICA3D. TODOS OS DIREITOS RESERVADOS.
            </div>
            <div className="flex items-center gap-6">
              <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-white/40 hover:text-funko-blue transition-colors cursor-pointer">
                <span className="font-black text-xs">IG</span>
              </div>
              <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-white/40 hover:text-funko-blue transition-colors cursor-pointer">
                <span className="font-black text-xs">FB</span>
              </div>
              <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-white/40 hover:text-funko-blue transition-colors cursor-pointer">
                <span className="font-black text-xs">TT</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
