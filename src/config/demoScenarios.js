/**
 * FieldMedic — Demo Scenarios
 *
 * Pre-built realistic scenarios for demo mode.
 * Simulates a full triage + guidance flow without any API calls.
 * Use during live demos to guarantee a flawless presentation.
 */

export const DEMO_SCENARIOS = {
  bleeding: {
    id: 'demo-bleeding',
    label: 'Severe arm laceration',
    description: 'Deep cut on forearm from broken glass, heavy bleeding',
    icon: '🩸',
    // Simulated triage result
    triage: {
      observation: 'Deep laceration approximately 8cm long on the left forearm. Significant arterial bleeding visible. Wound edges are jagged suggesting glass injury. No visible bone exposure.',
      severity: 'critical',
      injury_type: 'deep laceration',
      immediate_dangers: ['arterial bleeding', 'blood loss'],
      first_action: 'Apply firm direct pressure with both hands immediately — do not release.',
      confidence: 0.94,
      language: 'en',
    },
    // Simulated guidance
    guidance: {
      steps: [
        { index: 0, instruction: 'Apply firm, direct pressure with a clean cloth or clothing. Use both hands and press hard.', is_critical: true },
        { index: 1, instruction: 'Do not lift the cloth to check. If it soaks through, add more material on top.', is_critical: true },
        { index: 2, instruction: 'Elevate the arm above the level of the heart — raise it above their head if possible.', is_critical: false },
        { index: 3, instruction: 'Maintain steady pressure for at least 10 full minutes without releasing.', is_critical: false },
        { index: 4, instruction: 'If bleeding does not slow after 10 minutes, apply a tourniquet 5–8 cm above the wound.', is_critical: true },
        { index: 5, instruction: 'If using a tourniquet, write the exact time of application on the person\'s skin or clothing.', is_critical: false },
        { index: 6, instruction: 'Keep the person warm, calm, and still. Shock can develop — watch for pale, cold, clammy skin.', is_critical: false },
      ],
      call_emergency: true,
      emergency_note: 'Call emergency services immediately — arterial bleeding is life-threatening.',
      language: 'en',
      is_offline: false,
    },
    // Simulated wound image (base64 placeholder — orange tint to simulate wound)
    imageDataUrl: null,
  },

  burns: {
    id: 'demo-burns',
    label: 'Kitchen burn injury',
    description: 'Scald burns on hand and forearm from boiling water',
    icon: '🔥',
    triage: {
      observation: 'Partial thickness burns covering approximately 15% of the right hand and lower forearm. Skin appears red with blistering beginning to form. Consistent with hot liquid scald injury.',
      severity: 'serious',
      injury_type: 'partial thickness burns',
      immediate_dangers: ['fluid loss', 'infection risk'],
      first_action: 'Cool the burn immediately under cool running water — not cold, not ice.',
      confidence: 0.91,
      language: 'en',
    },
    guidance: {
      steps: [
        { index: 0, instruction: 'Hold the burned area under cool (not cold) running water for a full 20 minutes.', is_critical: true },
        { index: 1, instruction: 'Do NOT use ice, butter, toothpaste, or any cream — these cause more damage.', is_critical: true },
        { index: 2, instruction: 'While cooling, carefully remove watches, rings, or bracelets near the burn — swelling will make this impossible later.', is_critical: false },
        { index: 3, instruction: 'After 20 minutes of cooling, cover loosely with cling film or a clean non-fluffy material.', is_critical: false },
        { index: 4, instruction: 'Do not pop or burst any blisters — this increases infection risk significantly.', is_critical: false },
        { index: 5, instruction: 'Keep the person warm everywhere except the burned area — hypothermia risk is real during burn treatment.', is_critical: false },
      ],
      call_emergency: true,
      emergency_note: 'Burns larger than a hand on an adult require emergency medical attention.',
      language: 'en',
      is_offline: false,
    },
    imageDataUrl: null,
  },

  cardiac: {
    id: 'demo-cardiac',
    label: 'Cardiac arrest',
    description: 'Person collapsed, unresponsive, not breathing normally',
    icon: '❤️',
    triage: {
      observation: 'Person is unresponsive. No normal breathing detected — only occasional gasping. Skin appears pale. Consistent with cardiac arrest.',
      severity: 'critical',
      injury_type: 'cardiac arrest',
      immediate_dangers: ['cardiac arrest', 'brain damage without CPR', 'death'],
      first_action: 'Call emergency services NOW and begin CPR immediately.',
      confidence: 0.97,
      language: 'en',
    },
    guidance: {
      steps: [
        { index: 0, instruction: 'Call emergency services immediately — shout for someone else to call while you begin CPR.', is_critical: true },
        { index: 1, instruction: 'Lay the person flat on their back on a firm surface. Tilt head back slightly to open the airway.', is_critical: true },
        { index: 2, instruction: 'Place the heel of your hand on the centre of their chest, between the nipples. Put your other hand on top and interlock fingers.', is_critical: true },
        { index: 3, instruction: 'Push down hard and fast — compress the chest at least 5cm. Rate: 100 to 120 per minute. Sing "Staying Alive" in your head.', is_critical: true },
        { index: 4, instruction: 'Allow the chest to fully rise between each compression. Do not lean on the chest.', is_critical: false },
        { index: 5, instruction: 'If trained: after every 30 compressions, give 2 rescue breaths. If not trained, continuous compressions only is acceptable.', is_critical: false },
        { index: 6, instruction: 'If an AED is available, use it as soon as possible — turn it on and follow its voice instructions.', is_critical: true },
        { index: 7, instruction: 'Continue until emergency services arrive and take over. Do not stop unless the person shows clear signs of life.', is_critical: false },
      ],
      call_emergency: true,
      emergency_note: 'CALL 999 / 911 / 112 NOW. Every second without CPR reduces survival by 10%.',
      language: 'en',
      is_offline: false,
    },
    imageDataUrl: null,
  },
}
