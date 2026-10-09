# Wound-Type Assessment Checklist

## Purpose

This checklist documents the wound categories used by the DiabCare WoundCam models. It is intended for image review, annotation consistency, and decision support.

It is **not a diagnosis or treatment protocol**. A clinician must confirm the wound type, infection status, depth, circulation, and treatment plan.

The website must keep the two model outputs separate:

1. The detector identifies a visible region and draws a bounding box.
2. The AZH classifier assigns an image-level category to the cropped region.

Do not automatically convert one model label into another. For example, `dfu_ulcer` is related to `D`, but the labels are not interchangeable.

## General image-review checklist

For every image or detected region:

- [ ] Model label recorded
- [ ] Body location recorded
- [ ] Image shows an open wound, intact skin, or background
- [ ] Image quality is sufficient for review
- [ ] Approximate wound size recorded when visible
- [ ] Wound-bed appearance recorded:
  - [ ] Granulation tissue
  - [ ] Slough or yellow tissue
  - [ ] Necrotic or eschar tissue
  - [ ] Exposed fat, tendon, joint, or bone
- [ ] Drainage recorded:
  - [ ] None
  - [ ] Clear or serous
  - [ ] Bloody
  - [ ] Thick yellow or green
  - [ ] Foul-smelling
- [ ] Surrounding skin recorded:
  - [ ] Redness or other discoloration
  - [ ] Swelling
  - [ ] Increased warmth
  - [ ] Maceration
  - [ ] Callus or hyperkeratosis
  - [ ] Skin breakdown
- [ ] Infection warning signs reviewed
- [ ] Circulation or ischemia concerns referred for clinical assessment
- [ ] Clinician review required

## Detector model labels

### `dfu_ulcer` — Diabetic foot ulcer

- [ ] Open lesion on the foot
- [ ] Diabetes or diabetes-related foot context is documented
- [ ] Location recorded: sole, toe, heel, side of foot, or pressure-bearing area
- [ ] Callus or thickened skin near the lesion
- [ ] Neuropathy or reduced sensation considered
- [ ] Perfusion, ischemia, and circulation concerns considered
- [ ] Infection signs reviewed
- [ ] Depth and exposed structures reviewed
- [ ] Patient history and clinical examination required before confirmation

A diabetic foot ulcer is a break in foot skin associated with diabetes. Neuropathy and peripheral artery disease are common risk factors. The image label alone does not establish the diagnosis.

### `infected_wound` — Infected wound

- [ ] Increased redness or skin discoloration around the wound
- [ ] Swelling or induration
- [ ] Increased warmth
- [ ] Tenderness or pain
- [ ] Purulent discharge
- [ ] Foul odor
- [ ] Wound becoming larger or deeper
- [ ] Fever or feeling unwell
- [ ] Deeper tissue or bone involvement considered
- [ ] Infection severity assessed by a clinician

A photo cannot confirm or grade infection by itself. The IWGDF/IDSA guideline describes infection using clinical signs of inflammation and systemic findings.

### `necrotic_wound` — Necrotic wound

- [ ] Black, brown, gray, or dark tissue visible
- [ ] Dry, hard eschar or wet, soft necrotic tissue considered
- [ ] Slough obscuring the wound bed recorded
- [ ] Wound depth cannot be assumed from an image
- [ ] Odor and drainage reviewed
- [ ] Surrounding redness, warmth, and swelling reviewed
- [ ] Circulation and tissue viability assessed clinically
- [ ] Wound-bed assessment or debridement decision left to trained clinicians

Dark color alone does not prove necrosis. This label should prompt review, not determine treatment.

### `callus_corn` — Callus or corn

- [ ] Thickened or hardened skin visible
- [ ] Localized pressure point identified
- [ ] Yellowish or hyperkeratotic appearance recorded
- [ ] Circular or focal lesion considered
- [ ] Pain or pressure recorded
- [ ] Hidden ulcer under the callus considered
- [ ] Footwear and repeated pressure reviewed
- [ ] Not automatically classified as an open wound

### `normal_foot` — Visibly normal foot

- [ ] No visible open wound
- [ ] Skin appears intact
- [ ] No obvious drainage
- [ ] No major swelling
- [ ] No obvious abnormal discoloration
- [ ] No visible ulcer, callus, or corn requiring review
- [ ] Image quality is adequate

This means no visible abnormality was detected in the image. It does not prove normal circulation, sensation, or absence of an early problem.

## AZH classifier labels

### `BG` — Background

- [ ] No clear wound or skin region is visible
- [ ] Image may contain background, clothing, equipment, or irrelevant content
- [ ] Not interpreted as a wound type
- [ ] Consider retaking, reframing, or cropping the image

### `N` — Normal skin

- [ ] Skin is visible
- [ ] No obvious open wound
- [ ] No clear ulceration
- [ ] No obvious surgical incision
- [ ] No strong pressure-injury pattern
- [ ] No clear venous-wound pattern

`N` means normal-looking skin within the classifier label set. It is not a complete clinical clearance.

### `D` — Diabetic wound

- [ ] Wound is visible
- [ ] Diabetes-related context is available
- [ ] Foot location and pressure points reviewed
- [ ] Callus and neuropathy considered
- [ ] Infection signs reviewed
- [ ] Perfusion and ischemia risk considered
- [ ] Confirmed using patient history and clinical examination

`D` and `dfu_ulcer` are related concepts, but they are not identical labels. Keep their model outputs separate.

### `P` — Pressure wound

- [ ] Located over a bony prominence or repeated-pressure area
- [ ] Heel, ankle, hip, elbow, sacrum, or another pressure point considered
- [ ] Persistent discoloration assessed
- [ ] Skin warmth, firmness, sponginess, or pain assessed
- [ ] Blister or open wound recorded
- [ ] Mobility, friction, shear, and moisture risks reviewed
- [ ] Possible deeper tissue involvement referred for assessment

Pressure ulcers can begin as persistent discoloration and progress to blisters or deeper open wounds.

### `S` — Surgical wound

- [ ] Surgical incision or operative site is visible
- [ ] Wound edges appear closed, partly open, or separated
- [ ] Sutures, staples, or dressing may be present
- [ ] Redness and swelling reviewed
- [ ] Bleeding or increasing drainage reviewed
- [ ] Thick yellow or green discharge reviewed
- [ ] Odor reviewed
- [ ] Wound enlargement or deepening reviewed
- [ ] Fever or worsening pain reviewed
- [ ] Surgeon or clinician contacted when warning signs are present

### `V` — Venous wound

- [ ] Located on the lower leg or around the ankle
- [ ] Swelling or edema may be present
- [ ] Venous skin discoloration or other chronic skin changes considered
- [ ] Irregular or shallow ulcer appearance considered
- [ ] Drainage recorded
- [ ] Itching, scaling, or eczema-like surrounding skin recorded
- [ ] Infection signs reviewed
- [ ] Arterial circulation assessed before compression treatment
- [ ] Compression therapy supervised by trained healthcare staff

## Website result display

For each detected region, show the outputs separately:

```text
Detector:
  dfu_ulcer · 82%

AZH classifier:
  D · Diabetic wound · 67%

AZH probabilities:
  BG · Background · 3%
  D  · Diabetic wound · 67%
  N  · Normal skin · 4%
  P  · Pressure wound · 12%
  S  · Surgical wound · 5%
  V  · Venous wound · 9%

Status:
  Model suggestions only.
  Clinician review required.
```

## Safety boundary

The models may support image review, but they must not independently determine diagnosis, infection severity, wound stage, treatment, debridement, compression, antibiotics, or healing prognosis.

## References

- [Diabetic foot ulcers: Classification, risk factors and management](https://pmc.ncbi.nlm.nih.gov/articles/PMC9791567/)
- [2023 IWGDF/IDSA Guidelines for Diabetes-Related Foot Infections](https://academic.oup.com/cid/advance-article/doi/10.1093/cid/ciad527/7287196)
- [NHS: Pressure sores](https://www.nhs.uk/conditions/pressure-sores/)
- [NHS: Venous leg ulcer treatment](https://www.nhs.uk/conditions/leg-ulcer/treatment/)
- [MedlinePlus: Surgical wound care](https://medlineplus.gov/ency/patientinstructions/000040.htm)
