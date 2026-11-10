export type PetSpecies = "dog" | "cat";

export const petCareResources = {
  dogCare: {
    title: "General dog care",
    publisher: "ASPCA",
    species: "dog",
    url: "https://www.aspca.org/pet-care/dog-care/general-dog-care",
    reviewedAt: "2026-11-09",
  },
  catCare: {
    title: "General cat care",
    publisher: "ASPCA",
    species: "cat",
    url: "https://www.aspca.org/pet-care/cat-care/general-cat-care",
    reviewedAt: "2026-11-09",
  },
  catExercise: {
    title: "Exercising your cat",
    publisher: "PDSA",
    species: "cat",
    url: "https://www.pdsa.org.uk/pet-help-and-advice/looking-after-your-pet/kittens-cats/exercise-for-your-cat",
    reviewedAt: "2026-11-09",
  },
} as const;

interface PetCareTip {
  id: string;
  species: PetSpecies;
  category: "Everyday care" | "Exercise" | "Enrichment" | "Grooming" | "Safe play";
  title: string;
  text: string;
  source: keyof typeof petCareResources;
}

// Original summaries of the linked guidance. Review sources before changing advice.
// New resource URLs must also be added to the exact Tauri opener allowlist.
export const petCareTips: readonly PetCareTip[] = [
  { id: "dog-exercise", species: "dog", category: "Exercise", title: "Find their pace", text: "Match walks and activity to your dog's age, breed, and health. Ask your vet what suits them.", source: "dogCare" },
  { id: "dog-water", species: "dog", category: "Everyday care", title: "Keep water within reach", text: "Provide fresh drinking water and wash food and water bowls regularly. Offer shade and cool water outdoors in warm weather.", source: "dogCare" },
  { id: "dog-play", species: "dog", category: "Enrichment", title: "Make room for games", text: "Mix walks with supervised games such as retrieving or chasing to give your dog mental stimulation as well as movement.", source: "dogCare" },
  { id: "dog-grooming", species: "dog", category: "Grooming", title: "Brush and check their coat", text: "Brush regularly and check for fleas and ticks during warm weather. Discuss parasite prevention with your vet.", source: "dogCare" },
  { id: "dog-leash", species: "dog", category: "Safe play", title: "Choose a secure space", text: "Keep your dog on a leash outdoors unless they are in a secure, fenced area. Supervise games and outdoor activity.", source: "dogCare" },
  { id: "dog-rest", species: "dog", category: "Everyday care", title: "Give them a resting spot", text: "Provide a quiet, comfortable place to rest and wash their bedding regularly.", source: "dogCare" },
  { id: "cat-play", species: "cat", category: "Exercise", title: "Play in short bursts", text: "Offer short interactive play sessions with rest between them. Let your cat stop when they lose interest.", source: "catExercise" },
  { id: "cat-water", species: "cat", category: "Everyday care", title: "Refresh their water", text: "Keep fresh water available and wash and refill bowls daily. Ask your vet about food that suits your cat's life stage.", source: "catCare" },
  { id: "cat-enrichment", species: "cat", category: "Enrichment", title: "Create places to explore", text: "Offer climbing levels, hiding spots, and scratching surfaces. Rotate toys to keep play interesting.", source: "catExercise" },
  { id: "cat-toys", species: "cat", category: "Safe play", title: "Use toys they can catch", text: "Let your cat catch teaser toys. Use toys instead of fingers, and put string toys away after supervised play.", source: "catExercise" },
  { id: "cat-grooming", species: "cat", category: "Grooming", title: "Brush little and often", text: "Regular brushing or combing helps keep your cat's coat clean and reduces loose hair and hairballs.", source: "catCare" },
  { id: "cat-litter", species: "cat", category: "Everyday care", title: "Keep the litter box welcoming", text: "Place the litter box somewhere quiet and accessible, and scoop waste daily. Consult your vet about changes in litter box habits.", source: "catCare" },
];
