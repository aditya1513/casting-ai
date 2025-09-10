# Interaction Wireframes - State Changes & Dynamic Behaviors

## Executive Summary
This document defines all interactive states, transitions, and dynamic behaviors for CastMatch AI wireframes. Every interaction pattern is optimized for conversational interfaces, voice-first operation, and Mumbai casting workflow requirements. These specifications ensure consistent user experience across all touchpoints and devices.

## Core Interaction Principles

### 1. Conversational Flow Priority
**Principle:** Every interaction should feel like natural conversation
**Implementation:** State changes follow speech patterns with appropriate timing and feedback

### 2. Voice-First State Management
**Principle:** All states must be accessible and comprehensible through voice interaction
**Implementation:** Audio cues, speech confirmation, and voice-navigable state transitions

### 3. Mumbai Context Awareness
**Principle:** Interactions adapt to local conditions and cultural expectations
**Implementation:** Festival-aware scheduling, traffic-conscious timing, hierarchy-respectful confirmations

### 4. Progressive Enhancement
**Principle:** Core functionality works on all devices, enhanced features on capable devices
**Implementation:** Base interactions for mobile, enhanced states for desktop

## Button Interaction States

### Primary Button States
```
BUTTON_STATES = {
  default: {
    background: var(--color-primary),
    color: white,
    transform: scale(1),
    transition: all 200ms ease
  },
  
  hover: {
    background: #EA580C,
    transform: scale(1.02),
    box-shadow: var(--shadow-lg),
    transition: all 150ms ease
  },
  
  active: {
    background: #C2410C,
    transform: scale(0.98),
    transition: all 100ms ease
  },
  
  loading: {
    background: var(--color-primary),
    opacity: 0.8,
    cursor: wait,
    animation: pulse 1.5s infinite
  },
  
  success: {
    background: #22C55E,
    color: white,
    animation: successPulse 0.6s ease-out
  },
  
  error: {
    background: #EF4444,
    color: white,
    animation: shake 0.3s ease-in-out
  },
  
  disabled: {
    background: var(--color-gray-300),
    color: var(--color-gray-500),
    cursor: not-allowed,
    transform: none,
    opacity: 0.6
  }
}
```

### Voice Button Special States
```
VOICE_BUTTON_STATES = {
  idle: {
    background: var(--color-primary),
    color: white,
    animation: none
  },
  
  listening: {
    background: #EF4444,
    animation: pulseRecording 1s ease-in-out infinite,
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.4)
  },
  
  processing: {
    background: var(--color-secondary),
    animation: spin 1s linear infinite
  },
  
  success: {
    background: #22C55E,
    animation: successBounce 0.5s ease-out
  },
  
  error: {
    background: #EF4444,
    animation: errorShake 0.4s ease-in-out
  }
}
```

### Interaction Timing
- **Touch feedback:** Immediate visual response (0ms)
- **Hover state:** 150ms transition for smooth feel
- **Loading state:** Minimum 300ms display to avoid flicker
- **Success state:** 1200ms display before auto-return
- **Error state:** 2000ms display with manual dismiss option

## Input Field Interaction States

### Text Input States
```
INPUT_FIELD_STATES = {
  default: {
    border: 1px solid var(--color-gray-300),
    background: white,
    placeholder_opacity: 0.5
  },
  
  focus: {
    border: 2px solid var(--color-primary),
    box_shadow: 0 0 0 3px rgba(249, 115, 22, 0.1),
    placeholder_opacity: 0.3,
    outline: none
  },
  
  filled: {
    background: white,
    border: 1px solid var(--color-gray-400)
  },
  
  error: {
    border: 2px solid #EF4444,
    box_shadow: 0 0 0 3px rgba(239, 68, 68, 0.1),
    animation: inputShake 0.3s ease-in-out
  },
  
  success: {
    border: 2px solid #22C55E,
    box_shadow: 0 0 0 3px rgba(34, 197, 94, 0.1)
  },
  
  disabled: {
    background: var(--color-gray-100),
    border: 1px solid var(--color-gray-200),
    color: var(--color-gray-500),
    cursor: not-allowed
  }
}
```

### Voice Input Integration
```
VOICE_INPUT_STATES = {
  voice_ready: {
    position: relative,
    voice_button_visible: true,
    voice_icon_opacity: 0.7
  },
  
  voice_recording: {
    background: rgba(249, 115, 22, 0.1),
    border: 2px solid var(--color-primary),
    voice_waveform_visible: true,
    placeholder: "Listening..."
  },
  
  voice_processing: {
    background: rgba(245, 158, 11, 0.1),
    border: 2px solid var(--color-secondary),
    placeholder: "Processing speech...",
    loading_indicator: true
  },
  
  voice_transcribed: {
    background: rgba(34, 197, 94, 0.1),
    border: 2px solid #22C55E,
    text_content: "[transcribed_text]",
    confirmation_needed: true
  },
  
  voice_error: {
    background: rgba(239, 68, 68, 0.1),
    border: 2px solid #EF4444,
    placeholder: "Voice recognition failed. Try again or type.",
    retry_option: true
  }
}
```

## Chat Interface State Changes

### Conversation States
```
CHAT_INTERFACE_STATES = {
  initial: {
    ai_greeting: visible,
    input_placeholder: "Type your message or speak...",
    voice_button: prominent,
    suggestion_chips: visible
  },
  
  user_typing: {
    typing_indicator: hidden,
    send_button: enabled_when_content,
    character_count: visible_if_approaching_limit
  },
  
  ai_thinking: {
    typing_indicator: visible,
    input_disabled: true,
    message_queue: processing,
    animation: "AI is analyzing..."
  },
  
  ai_responding: {
    message_streaming: true,
    text_appears: word_by_word,
    action_buttons: appear_after_complete,
    voice_playback: available
  },
  
  conversation_complete: {
    summary_available: true,
    next_actions: visible,
    conversation_rating: optional,
    save_conversation: available
  },
  
  error_state: {
    error_message: visible,
    retry_options: available,
    fallback_contact: visible,
    conversation_recovery: enabled
  }
}
```

### Message State Transitions
```
MESSAGE_LIFECYCLE = {
  sending: {
    opacity: 0.6,
    sending_indicator: visible,
    edit_option: available
  },
  
  sent: {
    opacity: 1,
    timestamp: visible,
    status_indicator: delivered
  },
  
  acknowledged: {
    ai_typing_indicator: appears,
    message_processed: true
  },
  
  responded: {
    ai_response: linked_to_user_message,
    conversation_context: maintained
  }
}
```

## Card Component State Changes

### Talent Card States
```
TALENT_CARD_STATES = {
  default: {
    elevation: 2px,
    transform: none,
    quick_actions: hidden,
    match_score: visible
  },
  
  hover: {
    elevation: 8px,
    transform: translateY(-4px),
    quick_actions: fade_in_300ms,
    border: subtle_primary_glow,
    transition: all_300ms_ease
  },
  
  selected: {
    border: 2px solid var(--color-primary),
    background: rgba(249, 115, 22, 0.05),
    checkbox: visible_checked,
    elevation: 4px
  },
  
  shortlisted: {
    shortlist_badge: visible,
    background: rgba(34, 197, 94, 0.05),
    border: 1px solid #22C55E,
    star_icon: filled_gold
  },
  
  unavailable: {
    opacity: 0.5,
    unavailable_overlay: visible,
    quick_actions: disabled,
    alternative_suggestions: available
  },
  
  loading: {
    skeleton_animation: active,
    content: placeholder_shimmer,
    actions: disabled
  },
  
  error: {
    error_state_display: true,
    retry_button: visible,
    fallback_data: minimal_info
  }
}
```

### Card Interaction Sequences
```
CARD_INTERACTION_FLOW = {
  touch_start: {
    visual_feedback: immediate,
    scale: 0.98,
    preparation: prepare_quick_actions
  },
  
  touch_end: {
    action_trigger: determined_by_duration,
    short_tap: open_details,
    long_press: show_context_menu,
    swipe_right: add_to_shortlist,
    swipe_left: dismiss_candidate
  },
  
  quick_action_click: {
    action_feedback: immediate,
    loading_state: if_required,
    success_confirmation: visual_and_haptic,
    state_update: reflect_changes
  }
}
```

## Navigation State Management

### Mobile Navigation States
```
MOBILE_NAV_STATES = {
  collapsed: {
    hamburger_menu: visible,
    menu_overlay: hidden,
    bottom_nav: visible,
    main_content: full_width
  },
  
  menu_opening: {
    hamburger_icon: transforms_to_X,
    overlay: slides_in_from_left,
    backdrop: fades_in,
    main_content: shifts_right,
    duration: 300ms
  },
  
  menu_open: {
    navigation_items: fully_visible,
    overlay: covers_main_content,
    backdrop: blocks_interactions,
    close_gestures: swipe_left_or_tap_backdrop
  },
  
  menu_closing: {
    overlay: slides_out_to_left,
    backdrop: fades_out,
    main_content: returns_to_position,
    hamburger_icon: transforms_back,
    duration: 250ms
  }
}
```

### Desktop Navigation States
```
DESKTOP_NAV_STATES = {
  expanded: {
    sidebar_width: 280px,
    nav_items: text_and_icons,
    main_content: adjusted_margin,
    collapse_button: visible
  },
  
  collapsed: {
    sidebar_width: 64px,
    nav_items: icons_only,
    tooltips: show_on_hover,
    main_content: full_width_minus_64px,
    expand_button: visible
  },
  
  hover_expansion: {
    temporary_expand: on_hover_when_collapsed,
    tooltip_delay: 300ms,
    auto_collapse: on_mouse_leave_after_500ms
  }
}
```

## Form State Management

### Form Validation States
```
FORM_VALIDATION_STATES = {
  pristine: {
    validation: not_triggered,
    error_messages: hidden,
    submit_button: disabled_or_enabled_based_on_required
  },
  
  validating: {
    field_status: checking,
    loading_indicator: visible_for_async_validation,
    error_messages: cleared_previous
  },
  
  valid: {
    success_indicator: subtle_green_border,
    error_messages: hidden,
    next_field_focus: auto_advance_if_appropriate
  },
  
  invalid: {
    error_border: prominent_red,
    error_message: visible_with_help_text,
    error_icon: visible,
    field_focus: maintained_for_correction
  },
  
  server_error: {
    general_error_message: visible,
    field_specific_errors: highlighted,
    retry_mechanism: available
  }
}
```

### Multi-Step Form States
```
MULTI_STEP_FORM_STATES = {
  step_navigation: {
    progress_indicator: shows_current_and_total,
    completed_steps: checkmark_indicator,
    current_step: highlighted,
    future_steps: muted
  },
  
  step_transition: {
    slide_animation: horizontal_transition,
    validation_check: before_proceeding,
    data_persistence: automatic_save,
    back_navigation: always_available
  },
  
  step_completion: {
    success_feedback: step_marked_complete,
    auto_advance: after_validation_success,
    data_summary: available_for_review
  }
}
```

## Search Interface States

### Search Input States
```
SEARCH_STATES = {
  empty: {
    placeholder: "Search talent, projects, or ask AI...",
    voice_button: prominent,
    recent_searches: visible_dropdown,
    suggestions: empty_state_help
  },
  
  typing: {
    instant_search: triggered_after_2_chars,
    loading_indicator: visible,
    suggestions_dropdown: updating,
    voice_button: still_available
  },
  
  searching: {
    loading_state: visible,
    cancel_option: available,
    progress_indicator: for_long_searches,
    background_loading: for_subsequent_results
  },
  
  results_found: {
    result_count: visible,
    sort_options: available,
    filter_options: contextual,
    save_search: option_available
  },
  
  no_results: {
    no_results_message: helpful,
    search_suggestions: alternative_queries,
    broaden_search: option_to_expand_criteria,
    ai_assistance: offer_conversational_help
  },
  
  error: {
    error_message: user_friendly,
    retry_option: immediate,
    offline_search: if_available,
    contact_support: as_fallback
  }
}
```

### Filter State Management
```
FILTER_STATES = {
  filters_closed: {
    filter_button: shows_active_count,
    main_results: full_width,
    filter_chips: active_filters_visible
  },
  
  filters_opening: {
    panel_animation: slide_in_from_side,
    backdrop: dimmed_main_content,
    filter_sections: progressively_revealed
  },
  
  filters_open: {
    filter_sections: fully_expanded,
    apply_button: shows_result_count_preview,
    clear_all: available_when_filters_active,
    close_option: X_or_backdrop_tap
  },
  
  filters_applied: {
    active_filters: visible_as_chips,
    result_update: animated_transition,
    filter_count: badge_on_filter_button,
    clear_individual: X_on_each_chip
  }
}
```

## Voice Interface State Diagrams

### Voice Recording Flow
```
VOICE_RECORDING_FLOW = {
  idle_state: {
    voice_button: static_microphone_icon,
    background_listening: optional_wake_word,
    visual_state: default
  },
  
  activation: {
    trigger: button_press_or_wake_word,
    visual_feedback: button_color_change,
    audio_feedback: optional_beep,
    permission_check: microphone_access
  },
  
  recording: {
    visual_state: pulsing_red_button,
    waveform: real_time_visualization,
    timer: recording_duration,
    cancel_option: tap_to_stop
  },
  
  processing: {
    visual_state: spinning_or_loading_animation,
    status_text: "Processing speech...",
    cancel_still_available: with_fallback_to_typing
  },
  
  transcription_complete: {
    transcribed_text: displayed_in_input,
    confirmation_options: edit_or_send,
    retry_option: if_transcription_poor,
    auto_send: after_confirmation_timeout
  },
  
  error_handling: {
    error_types: no_permission, network_error, unclear_audio,
    fallback_options: type_instead, try_again,
    error_messaging: helpful_and_specific
  }
}
```

### AI Response States
```
AI_RESPONSE_STATES = {
  receiving_input: {
    user_message: received_and_displayed,
    ai_thinking: typing_indicator_appears,
    context_processing: analyzing_conversation_history
  },
  
  generating_response: {
    thinking_animation: 3_dots_pulsing,
    status_updates: "Analyzing request...", "Finding matches...",
    progress_indication: for_long_operations
  },
  
  streaming_response: {
    text_appearance: word_by_word_typing_effect,
    rich_content: cards_and_buttons_appear_after_text,
    voice_synthesis: text_to_speech_if_enabled
  },
  
  response_complete: {
    action_buttons: fully_interactive,
    voice_playback: available,
    follow_up_suggestions: contextual_quick_replies,
    feedback_options: thumbs_up_down
  },
  
  response_failed: {
    error_message: user_friendly_explanation,
    retry_options: rephrase_or_try_again,
    fallback_help: human_support_contact,
    conversation_recovery: maintain_context
  }
}
```

## Loading State Patterns

### Skeleton Loading States
```
SKELETON_LOADING = {
  talent_card_loading: {
    photo_area: shimmer_rectangle_200px_height,
    name_area: shimmer_line_60_percent_width,
    details_area: shimmer_lines_varying_width,
    actions_area: shimmer_buttons_2_buttons,
    animation: subtle_shimmer_1_5s_infinite
  },
  
  conversation_loading: {
    message_bubbles: shimmer_bubbles_varying_sizes,
    ai_avatar: shimmer_circle,
    typing_indicator: 3_animated_dots,
    input_area: fully_functional
  },
  
  search_results_loading: {
    result_cards: 6_skeleton_cards,
    filter_panel: shimmer_filter_options,
    pagination: shimmer_page_controls,
    progressive_loading: show_as_results_arrive
  }
}
```

### Progressive Loading Strategies
```
PROGRESSIVE_LOADING = {
  critical_first: {
    load_order: navigation, search_input, core_functionality,
    defer: images, animations, non_essential_features,
    fallback: functional_without_enhancements
  },
  
  image_loading: {
    placeholder: colored_background_or_initials,
    lazy_loading: intersection_observer,
    progressive_jpeg: if_supported,
    error_fallback: default_avatar_or_image
  },
  
  data_loading: {
    cache_first: show_cached_then_update,
    optimistic_updates: show_immediate_feedback,
    error_recovery: retry_with_backoff,
    offline_support: cached_data_when_available
  }
}
```

## Error State Management

### Error Display Patterns
```
ERROR_STATE_PATTERNS = {
  inline_errors: {
    field_level: red_border_with_message_below,
    form_level: error_summary_at_top,
    contextual: help_text_with_solutions
  },
  
  page_level_errors: {
    network_error: retry_button_with_offline_options,
    not_found: helpful_search_suggestions,
    permission_denied: clear_steps_to_resolve,
    server_error: contact_support_with_error_id
  },
  
  graceful_degradation: {
    partial_failure: show_available_data_note_limitations,
    feature_unavailable: explain_why_offer_alternatives,
    temporary_issues: estimated_resolution_time
  }
}
```

### Recovery Mechanisms
```
ERROR_RECOVERY = {
  automatic_retry: {
    network_requests: exponential_backoff_up_to_3_attempts,
    voice_recognition: single_automatic_retry,
    data_sync: background_retry_with_notification
  },
  
  user_initiated_retry: {
    retry_button: prominent_and_accessible,
    retry_all: for_batch_operations,
    partial_retry: for_specific_failed_items
  },
  
  alternative_paths: {
    voice_to_text: if_voice_recognition_fails,
    simplified_flow: if_full_flow_unavailable,
    contact_method: if_all_else_fails
  }
}
```

## Animation and Transition Specifications

### Timing Functions
```css
/* Animation timing for different interaction types */
--timing-instant: 0ms;              /* Touch feedback */
--timing-fast: 150ms;               /* Button hover */
--timing-base: 200ms;               /* Standard transitions */
--timing-slow: 300ms;               /* Panel slides */
--timing-deliberate: 500ms;         /* Page transitions */

/* Easing curves for different contexts */
--ease-out: cubic-bezier(0, 0, 0.2, 1);      /* UI exits */
--ease-in: cubic-bezier(0.4, 0, 1, 1);       /* UI entrances */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1); /* Standard UI */
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55); /* Playful */
```

### State Transition Animations
```css
/* Button state transitions */
.button-transition {
  transition: 
    background-color var(--timing-fast) var(--ease-out),
    transform var(--timing-fast) var(--ease-out),
    box-shadow var(--timing-fast) var(--ease-out);
}

/* Card hover animations */
.card-hover-transition {
  transition:
    transform var(--timing-base) var(--ease-out),
    box-shadow var(--timing-base) var(--ease-out),
    border-color var(--timing-base) var(--ease-out);
}

/* Panel slide animations */
.panel-slide-transition {
  transition: transform var(--timing-slow) var(--ease-in-out);
}

/* Loading state animations */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes bounce {
  0%, 20%, 53%, 80%, 100% { transform: scale(1); }
  40%, 43% { transform: scale(1.1); }
}
```

## Responsive Interaction Adaptations

### Mobile Interaction States
```
MOBILE_INTERACTION_ADAPTATIONS = {
  touch_targets: {
    minimum_size: 44px,
    spacing: 8px_minimum,
    feedback: immediate_visual_response
  },
  
  gesture_recognition: {
    swipe_threshold: 50px_minimum_distance,
    velocity_consideration: for_intent_detection,
    edge_swipes: navigation_gestures
  },
  
  voice_priority: {
    voice_button: prominent_placement,
    voice_shortcuts: available_throughout,
    hands_free_mode: complete_voice_navigation
  }
}
```

### Desktop Interaction Enhancements
```
DESKTOP_INTERACTION_ENHANCEMENTS = {
  hover_states: {
    all_interactive_elements: subtle_hover_feedback,
    cards: elevation_and_shadow_increase,
    buttons: color_and_scale_changes
  },
  
  keyboard_navigation: {
    tab_order: logical_and_comprehensive,
    keyboard_shortcuts: power_user_features,
    focus_indicators: clear_and_consistent
  },
  
  right_click_menus: {
    contextual_actions: relevant_to_element,
    keyboard_accessible: via_context_menu_key,
    consistent_positioning: near_trigger_element
  }
}
```

## Performance Considerations for Interactions

### Animation Performance
```
ANIMATION_PERFORMANCE = {
  gpu_acceleration: {
    properties: transform, opacity, filter,
    will_change: applied_during_animation,
    removal: cleaned_up_after_completion
  },
  
  frame_rate_targets: {
    critical_interactions: 60fps,
    decorative_animations: 30fps_acceptable,
    loading_animations: consistent_timing
  },
  
  reduced_motion: {
    respect_user_preference: prefers-reduced-motion,
    fallback_transitions: instant_or_minimal,
    essential_feedback: maintain_usability
  }
}
```

### State Management Performance
```
STATE_MANAGEMENT_PERFORMANCE = {
  debouncing: {
    search_input: 300ms_delay,
    api_calls: prevent_excessive_requests,
    validation: batch_validation_updates
  },
  
  caching: {
    component_states: cache_expensive_calculations,
    animation_states: reuse_animation_instances,
    form_data: persist_across_navigation
  },
  
  memory_management: {
    cleanup_timers: on_component_unmount,
    remove_listeners: prevent_memory_leaks,
    lazy_loading: load_states_as_needed
  }
}
```

## Testing Interaction States

### Interaction Testing Checklist
```
INTERACTION_TESTING = {
  state_transitions: {
    all_states_reachable: verify_each_state_accessible,
    transition_timing: confirm_appropriate_durations,
    visual_feedback: ensure_clear_state_indication
  },
  
  error_conditions: {
    network_failures: test_offline_behavior,
    permission_denied: test_fallback_flows,
    invalid_inputs: test_validation_states
  },
  
  accessibility: {
    keyboard_navigation: test_all_interactions_keyboard_accessible,
    screen_reader: verify_state_announcements,
    voice_control: test_voice_navigation_states
  },
  
  performance: {
    animation_smoothness: verify_60fps_on_target_devices,
    memory_usage: check_for_memory_leaks,
    battery_impact: minimize_unnecessary_animations
  }
}
```

### Mumbai-Specific Testing
```
MUMBAI_CONTEXT_TESTING = {
  network_conditions: {
    slow_3g: test_loading_states_on_slow_connections,
    intermittent_connectivity: test_offline_state_management,
    high_latency: ensure_feedback_for_delayed_responses
  },
  
  device_conditions: {
    older_android: test_on_common_mumbai_devices,
    memory_constraints: verify_performance_on_low_ram,
    battery_optimization: test_background_state_handling
  },
  
  cultural_context: {
    bilingual_input: test_hindi_english_mixed_states,
    festival_periods: test_schedule_aware_state_changes,
    hierarchy_interactions: verify_respectful_confirmation_flows
  }
}
```

## Implementation Guidelines

### State Management Architecture
```javascript
// Example state machine for voice interaction
const voiceInteractionStates = {
  idle: {
    on: {
      ACTIVATE: 'listening',
      WAKE_WORD: 'listening'
    }
  },
  listening: {
    on: {
      SPEECH_DETECTED: 'processing',
      TIMEOUT: 'idle',
      CANCEL: 'idle'
    },
    entry: 'startRecording',
    exit: 'stopRecording'
  },
  processing: {
    on: {
      TRANSCRIPTION_SUCCESS: 'transcribed',
      TRANSCRIPTION_ERROR: 'error',
      TIMEOUT: 'error'
    },
    entry: 'processAudio'
  },
  transcribed: {
    on: {
      CONFIRM: 'sending',
      EDIT: 'editing',
      RETRY: 'listening'
    }
  },
  sending: {
    on: {
      SUCCESS: 'idle',
      ERROR: 'error'
    }
  },
  error: {
    on: {
      RETRY: 'listening',
      FALLBACK: 'idle'
    },
    entry: 'showError'
  }
};
```

### CSS State Classes
```css
/* State-based CSS classes for consistent styling */
.state-loading {
  pointer-events: none;
  opacity: 0.7;
  cursor: wait;
}

.state-error {
  border-color: #EF4444;
  background-color: rgba(239, 68, 68, 0.1);
}

.state-success {
  border-color: #22C55E;
  background-color: rgba(34, 197, 94, 0.1);
}

.state-disabled {
  opacity: 0.5;
  pointer-events: none;
  cursor: not-allowed;
}

.state-focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.state-hover:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
```

---

**Interaction Specification Status:** Complete ✅  
**State Patterns Documented:** 50+ comprehensive interaction patterns  
**Animation Timing:** Optimized for 60fps performance  
**Voice Integration:** Complete voice-first state management  
**Mumbai Context:** Cultural and technical adaptations included  
**Accessibility:** Full keyboard and screen reader state support  
**Performance:** GPU-accelerated animations with fallbacks