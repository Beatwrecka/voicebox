import { useMatchRoute } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { BookmarkPlus, Loader2, SlidersHorizontal, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { LANGUAGE_OPTIONS } from '@/lib/constants/languages';
import { useGenerationForm } from '@/lib/hooks/useGenerationForm';
import { useProfile, useProfiles } from '@/lib/hooks/useProfiles';
import { useAddStoryItem, useStory } from '@/lib/hooks/useStories';
import { cn } from '@/lib/utils/cn';
import { useBlendPresetStore } from '@/stores/blendPresetStore';
import { useStoryStore } from '@/stores/storyStore';
import { useUIStore } from '@/stores/uiStore';

interface FloatingGenerateBoxProps {
  isPlayerOpen?: boolean;
  showVoiceSelector?: boolean;
  mode?: 'floating' | 'docked';
}

export function FloatingGenerateBox({
  isPlayerOpen = false,
  showVoiceSelector = false,
  mode = 'floating',
}: FloatingGenerateBoxProps) {
  const selectedProfileId = useUIStore((state) => state.selectedProfileId);
  const setSelectedProfileId = useUIStore((state) => state.setSelectedProfileId);
  const { data: selectedProfile } = useProfile(selectedProfileId || '');
  const { data: profiles } = useProfiles();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInstructMode, setIsInstructMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const matchRoute = useMatchRoute();
  const isStoriesRoute = matchRoute({ to: '/stories' });
  const selectedStoryId = useStoryStore((state) => state.selectedStoryId);
  const trackEditorHeight = useStoryStore((state) => state.trackEditorHeight);
  const { data: currentStory } = useStory(selectedStoryId);
  const addStoryItem = useAddStoryItem();
  const { toast } = useToast();
  const presets = useBlendPresetStore((state) => state.presets);
  const savePreset = useBlendPresetStore((state) => state.savePreset);
  const deletePreset = useBlendPresetStore((state) => state.deletePreset);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const isDocked = mode === 'docked';

  // Calculate if track editor is visible (on stories route with items)
  const hasTrackEditor = isStoriesRoute && currentStory && currentStory.items.length > 0;

  const { form, handleSubmit, isPending } = useGenerationForm({
    onSuccess: async (generationId) => {
      setIsExpanded(false);
      // If on stories route and a story is selected, add generation to story
      if (isStoriesRoute && selectedStoryId && generationId) {
        try {
          await addStoryItem.mutateAsync({
            storyId: selectedStoryId,
            data: { generation_id: generationId },
          });
          toast({
            title: 'Added to story',
            description: `Generation added to "${currentStory?.name || 'story'}"`,
          });
        } catch (error) {
          toast({
            title: 'Failed to add to story',
            description:
              error instanceof Error ? error.message : 'Could not add generation to story',
            variant: 'destructive',
          });
        }
      }
    },
  });

  const language = form.watch('language');
  const modelSize = form.watch('modelSize') ?? '1.7B';

  // Click away handler to collapse the box
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;

      // Don't collapse if clicking inside the container
      if (containerRef.current?.contains(target)) {
        return;
      }

      // Don't collapse if clicking on a Select dropdown (which renders in a portal)
      if (
        target.closest('[role="listbox"]') ||
        target.closest('[data-radix-popper-content-wrapper]')
      ) {
        return;
      }

      setIsExpanded(false);
    }

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  // Set first voice as default if none selected
  useEffect(() => {
    if (!selectedProfileId && profiles && profiles.length > 0) {
      setSelectedProfileId(profiles[0].id);
    }
  }, [selectedProfileId, profiles, setSelectedProfileId]);

  // Auto-resize textarea based on content (only when expanded)
  useEffect(() => {
    if (!isExpanded) {
      // Reset textarea height after collapse animation completes
      const timeoutId = setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.style.height = '32px';
          textarea.style.overflowY = 'hidden';
        }
      }, 200); // Wait for animation to complete
      return () => clearTimeout(timeoutId);
    }

    const textarea = textareaRef.current;
    if (!textarea) return;

    const adjustHeight = () => {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const minHeight = 100; // Expanded minimum
      const maxHeight = 300; // Max height in pixels
      const targetHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      textarea.style.height = `${targetHeight}px`;

      // Show scrollbar if content exceeds max height
      if (scrollHeight > maxHeight) {
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.overflowY = 'hidden';
      }
    };

    // Small delay to let framer animation complete
    const timeoutId = setTimeout(() => {
      adjustHeight();
    }, 200);

    // Adjust on mount and when value changes
    adjustHeight();

    // Watch for input changes
    textarea.addEventListener('input', adjustHeight);

    return () => {
      clearTimeout(timeoutId);
      textarea.removeEventListener('input', adjustHeight);
    };
  }, [isExpanded]);

  async function onSubmit(data: Parameters<typeof handleSubmit>[0]) {
    await handleSubmit(data, selectedProfileId);
  }

  useEffect(() => {
    if (!selectedPresetId) {
      return;
    }

    const exists = presets.some((preset) => preset.id === selectedPresetId);
    if (!exists) {
      setSelectedPresetId('');
    }
  }, [presets, selectedPresetId]);

  function applyPreset(presetId: string) {
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }

    if (preset.primaryProfileId) {
      setSelectedProfileId(preset.primaryProfileId);
    }

    form.setValue('secondaryProfileId', preset.secondaryProfileId ?? undefined, { shouldDirty: true });
    form.setValue('secondaryWeight', preset.secondaryWeight, { shouldDirty: true });
    form.setValue('pitchShift', preset.pitchShift, { shouldDirty: true });
    form.setValue('formantShift', preset.formantShift, { shouldDirty: true });
    form.setValue('language', preset.language, { shouldDirty: true });
    form.setValue('modelSize', preset.modelSize, { shouldDirty: true });

    setSelectedPresetId(preset.id);
    setIsExpanded(true);
    toast({
      title: 'Voice recipe loaded',
      description: `Applied "${preset.name}"`,
    });
  }

  function onPresetSelect(value: string) {
    if (value === '__none__') {
      setSelectedPresetId('');
      return;
    }
    applyPreset(value);
  }

  function handleSavePreset() {
    if (!selectedProfileId) {
      toast({
        title: 'No voice selected',
        description: 'Select a base voice before saving a blend recipe.',
        variant: 'destructive',
      });
      return;
    }

    const values = form.getValues();
    const primaryVoice = profiles?.find((profile) => profile.id === selectedProfileId)?.name ?? 'Voice';
    const secondaryVoice = values.secondaryProfileId
      ? profiles?.find((profile) => profile.id === values.secondaryProfileId)?.name
      : null;
    const suggestedName = secondaryVoice ? `${primaryVoice} + ${secondaryVoice}` : `${primaryVoice} FX`;
    const name = window.prompt('Save voice recipe as:', suggestedName)?.trim();

    if (!name) {
      return;
    }

    const preset = savePreset({
      name,
      primaryProfileId: selectedProfileId,
      secondaryProfileId: values.secondaryProfileId ?? null,
      secondaryWeight: values.secondaryWeight,
      pitchShift: values.pitchShift,
      formantShift: values.formantShift,
      language,
      modelSize,
    });

    setSelectedPresetId(preset.id);
    toast({
      title: 'Voice recipe saved',
      description: `"${preset.name}" is now available in saved blends.`,
    });
  }

  function handleDeletePreset() {
    if (!selectedPresetId) {
      return;
    }

    const preset = presets.find((item) => item.id === selectedPresetId);
    if (!preset) {
      return;
    }

    if (!confirm(`Delete saved voice recipe "${preset.name}"?`)) {
      return;
    }

    deletePreset(selectedPresetId);
    setSelectedPresetId('');
    toast({
      title: 'Voice recipe deleted',
      description: `"${preset.name}" was removed.`,
    });
  }

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        isDocked
          ? 'relative w-full max-w-[900px]'
          : cn(
              'fixed right-auto',
              isStoriesRoute
                ? // Position aligned with story list: after sidebar + padding, width 360px
                  'left-[calc(5rem+2rem)] w-[360px]'
                : 'left-[calc(5rem+2rem)] w-[calc((100%-5rem-4rem)/2-1rem)]',
            ),
      )}
      style={
        isDocked
          ? undefined
          : {
              // On stories route: offset by track editor height when visible
              // On other routes: offset by audio player height when visible
              bottom: hasTrackEditor
                ? `${trackEditorHeight + 24}px`
                : isPlayerOpen
                  ? 'calc(7rem + 1.5rem)'
                  : '1.5rem',
            }
      }
    >
      <motion.div
        className="neu-surface-strong backdrop-blur-xl rounded-[2rem] transition-all duration-300 p-3"
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex gap-2">
              <motion.div
                className={cn('flex-1', isExpanded && 'mr-12')}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {/* Text field - hidden when in instruct mode */}
                <div style={{ display: isInstructMode ? 'none' : 'block' }}>
                  <FormField
                    control={form.control}
                    name="text"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <motion.div
                            animate={{
                              height: isExpanded ? 'auto' : '32px',
                            }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            style={{ overflow: 'hidden' }}
                          >
                            <Textarea
                              {...field}
                              ref={(node: HTMLTextAreaElement | null) => {
                                // Store ref for auto-resize (only for active field)
                                if (!isInstructMode) {
                                  textareaRef.current = node;
                                }
                                // Forward ref to react-hook-form
                                if (typeof field.ref === 'function') {
                                  field.ref(node);
                                }
                              }}
                              placeholder={
                                isStoriesRoute && currentStory
                                  ? `Generate speech for "${currentStory.name}"...`
                                  : selectedProfile
                                    ? `Generate speech using ${selectedProfile.name}...`
                                    : 'Select a voice profile above...'
                              }
                              className="resize-none bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 outline-none ring-0 rounded-2xl text-sm placeholder:text-muted-foreground/60 w-full"
                              style={{
                                minHeight: isExpanded ? '100px' : '32px',
                                maxHeight: '300px',
                              }}
                              disabled={!selectedProfileId}
                              onClick={() => setIsExpanded(true)}
                              onFocus={() => setIsExpanded(true)}
                            />
                          </motion.div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
                {/* Instruct field - hidden when in text mode */}
                <div style={{ display: isInstructMode ? 'block' : 'none' }}>
                  <FormField
                    control={form.control}
                    name="instruct"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <motion.div
                            animate={{
                              height: isExpanded ? 'auto' : '32px',
                            }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            style={{ overflow: 'hidden' }}
                          >
                            <Textarea
                              {...field}
                              ref={(node: HTMLTextAreaElement | null) => {
                                // Store ref for auto-resize (only for active field)
                                if (isInstructMode) {
                                  textareaRef.current = node;
                                }
                                // Forward ref to react-hook-form
                                if (typeof field.ref === 'function') {
                                  field.ref(node);
                                }
                              }}
                              placeholder="e.g. very happy and excited"
                              className="resize-none bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 outline-none ring-0 rounded-2xl text-sm placeholder:text-muted-foreground/60 w-full"
                              style={{
                                minHeight: isExpanded ? '100px' : '32px',
                                maxHeight: '300px',
                              }}
                              disabled={!selectedProfileId}
                              onClick={() => setIsExpanded(true)}
                              onFocus={() => setIsExpanded(true)}
                            />
                          </motion.div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </motion.div>

              <div className="relative shrink-0">
                <div className="group relative">
                  <Button
                    type="submit"
                    disabled={isPending || !selectedProfileId}
                    className="h-10 w-10 rounded-full bg-accent hover:bg-accent/90 hover:scale-105 text-accent-foreground shadow-lg hover:shadow-accent/50 transition-all duration-200"
                    size="icon"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-md bg-popover px-3 py-1.5 text-xs text-popover-foreground border border-border opacity-0 transition-opacity group-hover:opacity-100 z-[9999]">
                    {isPending
                      ? 'Generating...'
                      : !selectedProfileId
                        ? 'Select a voice profile first'
                        : 'Generate speech'}
                  </span>
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-0 right-[calc(100%+0.5rem)]"
                    >
                      <div className="group relative">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsInstructMode(!isInstructMode)}
                          className={cn(
                            'h-10 w-10 rounded-full transition-all duration-200',
                            isInstructMode
                              ? 'bg-accent text-accent-foreground border border-accent hover:bg-accent/90'
                              : 'bg-card border border-border hover:bg-background/50',
                          )}
                        >
                          <SlidersHorizontal className="h-4 w-4" />
                        </Button>
                        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-md bg-popover px-3 py-1.5 text-xs text-popover-foreground border border-border opacity-0 transition-opacity group-hover:opacity-100 z-[9999]">
                          Fine tune instructions
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <AnimatePresence>
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className=" mt-3"
              >
                <div className="flex items-center gap-2">
                  {showVoiceSelector && (
                    <div className="flex-1">
                      <Select
                        value={selectedProfileId || ''}
                        onValueChange={(value) => setSelectedProfileId(value || null)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-card border-border rounded-full hover:bg-background/50 transition-all w-full">
                          <SelectValue placeholder="Select a voice..." />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles?.map((profile) => (
                            <SelectItem key={profile.id} value={profile.id} className="text-xs">
                              {profile.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem className="flex-1 space-y-0">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs bg-card border-border rounded-full hover:bg-background/50 transition-all">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {LANGUAGE_OPTIONS.map((lang) => (
                              <SelectItem key={lang.value} value={lang.value} className="text-xs">
                                {lang.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="modelSize"
                    render={({ field }) => (
                      <FormItem className="flex-1 space-y-0">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs bg-card border-border rounded-full hover:bg-background/50 transition-all">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1.7B" className="text-xs text-muted-foreground">
                              Qwen3-TTS 1.7B
                            </SelectItem>
                            <SelectItem value="0.6B" className="text-xs text-muted-foreground">
                              Qwen3-TTS 0.6B
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1">
                    <Select value={selectedPresetId || '__none__'} onValueChange={onPresetSelect}>
                      <SelectTrigger className="h-8 text-xs bg-card border-border rounded-full hover:bg-background/50 transition-all">
                        <SelectValue placeholder="Saved blend recipes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" className="text-xs text-muted-foreground">
                          Saved blend recipes
                        </SelectItem>
                        {presets.map((preset) => (
                          <SelectItem key={preset.id} value={preset.id} className="text-xs">
                            {preset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleSavePreset}
                    className="h-8 w-8 rounded-full"
                    title="Save current blend"
                  >
                    <BookmarkPlus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleDeletePreset}
                    disabled={!selectedPresetId}
                    className="h-8 w-8 rounded-full"
                    title="Delete selected blend"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="mt-2 space-y-2">
                  <FormField
                    control={form.control}
                    name="secondaryProfileId"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormControl>
                          <Select
                            onValueChange={(value) =>
                              field.onChange(value === '__none__' ? undefined : value)
                            }
                            value={field.value || '__none__'}
                          >
                            <SelectTrigger className="h-8 text-xs bg-card border-border rounded-full hover:bg-background/50 transition-all">
                              <SelectValue placeholder="Blend voice (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__" className="text-xs text-muted-foreground">
                                No blend voice
                              </SelectItem>
                              {profiles
                                ?.filter((profile) => profile.id !== selectedProfileId)
                                .map((profile) => (
                                  <SelectItem
                                    key={profile.id}
                                    value={profile.id}
                                    className="text-xs text-muted-foreground"
                                  >
                                    Blend with {profile.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="secondaryWeight"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Blend Weight</span>
                          <span>
                            {Math.round((1 - field.value) * 100)}% / {Math.round(field.value * 100)}%
                          </span>
                        </div>
                        <FormControl>
                          <Slider
                            min={0}
                            max={1}
                            step={0.05}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0] ?? 0.5)}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="pitchShift"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>Pitch</span>
                            <span>
                              {field.value > 0 ? '+' : ''}
                              {field.value.toFixed(1)} st
                            </span>
                          </div>
                          <FormControl>
                            <Slider
                              min={-12}
                              max={12}
                              step={0.5}
                              value={[field.value]}
                              onValueChange={(value) => field.onChange(value[0] ?? 0)}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="formantShift"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>Formant</span>
                            <span>{field.value.toFixed(2)}x</span>
                          </div>
                          <FormControl>
                            <Slider
                              min={0.7}
                              max={1.4}
                              step={0.01}
                              value={[field.value]}
                              onValueChange={(value) => field.onChange(value[0] ?? 1)}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </form>
        </Form>
      </motion.div>
    </motion.div>
  );
}
