/**
 * Every word on the page. Components render this; they never hard-code copy.
 * Headlines with an `accent` render it as the one italic word.
 */

import type { PhotoKey } from "./photos"

export type Headline = { before: string; accent?: string; after?: string }

export const site = {
  name: "Avelune",
  tagline: "Summer journeys for families",
  pronunciation: "ah-veh-LOON",
  contactEmail: "hello@avelunefamily.com",
  foundedYear: 2026,

  hero: {
    eyebrow: "Summer 2027 · San Sebastián, Spain · Antigua, Guatemala",
    headline: { before: "The world is theirs to discover. The summer is", accent: "yours", after: "to enjoy." } as Headline,
    subhead:
      "Avelune creates thoughtfully curated international summer experiences that bring families together through adventure, cultural discovery, and meaningful connections. While children learn, explore, and make new friends through carefully selected local programs, parents have the freedom to experience the destination in their own way.",
    subheadMobile:
      "While children learn, explore, and make new friends through carefully selected local programs, parents have the freedom to experience the destination in their own way.",
    cta: "Request early access",
    microcopy:
      "Email only, for now. No pricing yet, no pressure. We will write once, when the first itineraries open, and not otherwise.",
    verticalLabel: ["San Sebastián · 43.3°N", "Antigua · 14.5°N"],
    photo: "conchaBlueHour" satisfies PhotoKey,
  },

  firstSummer: {
    eyebrow: "The first summer",
    headline: { before: "Surf lesson at seven. Pintxos at one. Nobody opened a map." } as Headline,
    body:
      "In summer 2027 Avelune runs its first two summers: the Basque coast around San Sebastián in June, and the highlands around Antigua, Guatemala, in August, two to four weeks each. Six to ten families on each. Every day has the same shape, and the shape is the whole idea.",
    stats: [
      { value: "2–4", label: "weeks" },
      { value: "6–10", label: "families" },
      { value: "1", label: "long table" },
    ],
    rhythm: [
      {
        title: "Mornings apart",
        body: "Children spend their mornings in local programs chosen for their age: time outdoors, new skills, new friends. Parents go wherever grown-ups go when nobody needs them.",
      },
      {
        title: "Afternoons together, or not",
        body: "Lunch, a swim, a slow hour. Explore together or go your own way; the afternoon is yours to shape.",
      },
      {
        title: "Evenings for everyone",
        body: "Dinner somewhere local, a walk home through streets you are starting to know, and now and then a table shared with the families you have met. The children sleep well; the adults get a second hour.",
      },
    ],
    photo: "longTableOcean" satisfies PhotoKey,
  },

  nav: {
    label: "Sections",
    items: [
      { label: "The summer", href: "#summer" },
      { label: "San Sebastián", href: "#san-sebastian" },
      { label: "Antigua", href: "#antigua" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Every age", href: "#every-age" },
      { label: "Founding families", href: "#founding" },
      { label: "Questions", href: "#questions" },
    ],
  },

  destinations: {
    eyebrow: "Two places, chosen slowly",
    headline: { before: "A coast that eats well. A town under three volcanoes." } as Headline,
    body:
      "We looked for places that reward children and adults at the same time: walkable, safe, beautiful on an ordinary Tuesday, with a food culture a nine-year-old can take part in. We found two for the first year. The moments under each are drawn from the working itineraries; final venues and dates go to founding families first.",
    places: [
      {
        id: "san-sebastian",
        name: "San Sebastián",
        country: "Spain",
        when: "June 2027",
        surface: "atlantic" as const,
        body:
          "The Basque coast. La Concha for the small ones, Zurriola for the surfers, pintxos counters in the Parte Vieja the teenagers will think they discovered. A wooden funicular up Monte Igueldo that has run since 1912. Grilled turbot in Getaria, txakoli vines on the hills above the sea, Chillida's iron combs where the swell hits Ondarreta.",
        photo: "conchaAerial" satisfies PhotoKey,
        moments: [
          {
            title: "Zurriola, seven in the morning",
            body: "The surf beach on the Gros side, before the city is up. Instructors in the water with the Explorers, the Crew learning to read the break, the Residents on a peak of their own. The Small Ones build a dam at the stream with a host. Parents: the café by the Kursaal has the coffee, and nobody needs you for two hours.",
            ages: "All ages, split by tier",
          },
          {
            title: "Pintxos, in two sittings",
            body: "The Parte Vieja at five is for children: a route of three bars, a gilda on a toothpick, a slab of tortilla, a glass of something fizzy, the rules of the counter explained. At eight the same streets belong to the parents, and the host team has the children at the house.",
            ages: "Children at five; adults at eight",
          },
          {
            title: "Up Monte Igueldo on the 1912 funicular",
            body: "Wooden cars, a short steep climb from Ondarreta, and at the top a small amusement park from the same era, with a slow rail ride along the cliff edge and the best view of La Concha there is. Ice cream at the rail. The Small Ones ride the funicular twice. Everyone else looks at the view and then rides it twice.",
            ages: "All ages; unstructured on purpose",
          },
          {
            title: "Getaria, turbot on the grill",
            body: "Twenty-five minutes west along the coast to a fishing village where whole fish go on the coals by the harbour. The kids walk the sea wall and count the boats. The parents taste txakoli at a winery above the town with the Atlantic below the vines, and the Residents take the ten-minute detour to the Balenciaga museum if they want it.",
            ages: "All ages; the winery is for adults",
          },
          {
            title: "The Comb of the Wind when the sea is up",
            body: "At the far end of Ondarreta, Chillida's three iron combs grip the rocks and the sea comes up through blowholes in the paving. When the swell is in, the spray goes ten feet in the air and every child under twelve is drenched and delighted. Four-year-olds will stand there for an hour waiting for the next one. So will you. Towels in the van.",
            ages: "All ages; best for 3 to 9",
          },
        ],
      },
      {
        id: "antigua",
        name: "Antigua",
        country: "Guatemala",
        when: "August 2027",
        surface: "cacao" as const,
        body:
          "A colonial town of low painted houses and cobbled streets, with Volcán de Agua at the end of every one of them. Coffee and cacao farms a short drive out. A volcano you can walk on in a day with a seven-year-old. A lake ringed by volcanoes, where women's cooperatives weave on backstrap looms and dye cotton with plants.",
        photo: "atitlanDusk" satisfies PhotoKey,
        moments: [
          {
            title: "The arch and the volcano",
            body: "On the first evening the host walks the group down Calle del Arco to the Arco de Santa Catalina with Volcán de Agua in the frame behind it, and explains how the town reads: the grid, the ruins, the three volcanoes. By the second day the Crew can navigate it alone, and the Residents have taken the photo everyone takes and then a better one.",
            ages: "All ages; forty minutes with stops",
          },
          {
            title: "Cacao, pod to bar",
            body: "A bean-to-bar morning in town. Crack the pod, roast the beans, winnow, grind on a stone metate the way it was done here before Europe knew what chocolate was, then drink it the way it was drunk before sugar, and mould a bar to take home. The adults' class is cleaner. The kids' class is better.",
            ages: "All ages; a shorter session for 3 to 5",
          },
          {
            title: "A coffee finca under Agua",
            body: "A working farm on the volcano's lower slopes. The Explorers walk the rows, see the drying patios, roast a handful over a pan and learn why the beans are red. Parents and Residents get a cupping with the farm's roaster. Summer is between harvests, so the plants are at their lushest and the tasting room is quiet. The Small Ones meet the farm dogs.",
            ages: "All ages; cupping 14 and up",
          },
          {
            title: "Pacaya, and marshmallows on the rock",
            body: "An hour and a half from town, a volcano you can walk on. A steady trail over old lava fields to viewpoints below the cone, horses waiting at the base for small legs, and at a designated spot near the top the guides hand out sticks and you roast marshmallows over rock still warm from underneath. Lava itself is never promised; the landscape is. The Small Ones stay at the base with a host and a picnic.",
            ages: "6 to 17 on foot; 3 to 5 by horse or at the base",
          },
          {
            title: "Across Atitlán to the weavers",
            body: "A morning's drive to Panajachel, then everything happens by boat. A lancha across a lake ringed by volcanoes to San Juan La Laguna, where women's cooperatives spin cotton by hand and dye it with avocado bark, pericón and indigo. The Crew sit at a backstrap loom. Lunch on a dock. A strip of cotton she dyed herself goes home in the carry-on, still smelling of the plants.",
            ages: "All ages; loom lesson 7 and up",
          },
        ],
      },
    ],
  },

  howItWorks: {
    eyebrow: "How Avelune works",
    headline: { before: "Your summer, thoughtfully connected." } as Headline,
    body:
      "One booking. One group chat. One person whose job is to know your family's names, ages, allergies and the one thing your middle child refuses to eat. Everything a trip like this needs is handled before you land, and then handled again, live, by people who are travelling with you.",
    pillars: [
      {
        title: "Choose your destination",
        body: "Explore our summer experiences in San Sebastián or Antigua and select the dates that work for your family.",
      },
      {
        title: "Discover the right program",
        body: "We help you understand available local programs, age groups, activities, and enrollment options.",
      },
      {
        title: "Prepare for your summer",
        body: "Receive practical program information, schedules, and guidance to help your family prepare.",
      },
      {
        title: "Enjoy the experience",
        body: "Children participate in their selected programs while parents enjoy the destination at their own pace.",
      },
    ],
  },

  everyAge: {
    eyebrow: "Every age, engaged",
    headline: { before: "Three to fourteen. Every age, its own way." } as Headline,
    tiers: [
      {
        range: "3–5",
        name: "Little Explorers",
        body: "Creative play, early discovery, outdoor activities, and gentle introductions to new environments.",
        photo: "tallGrass" satisfies PhotoKey,
      },
      {
        range: "6–9",
        name: "Adventurers",
        body: "Active days filled with sports, creative exploration, new skills, and friendships.",
        photo: "surfersWalkingIn" satisfies PhotoKey,
      },
      {
        range: "10–14",
        name: "Trailblazers",
        body: "Greater independence, skill-building, outdoor challenges, and cultural discovery.",
        photo: "weaving" satisfies PhotoKey,
      },
      {
        range: "Parents",
        name: "Hours that are yours",
        body: "On the itinerary, in writing. A surf lesson of your own, a txakoli winery above the sea, a long lunch with no one asking for the wifi. A table at the end of the day with people who get it.",
        photo: "longTableFood" satisfies PhotoKey,
      },
    ],
  },

  founding: {
    eyebrow: "Founding families",
    headline: { before: "The first families get the first word." } as Headline,
    body:
      "Early access is a short list, not a mailing list. The families on it see the 2027 itineraries before anyone else, help shape them, and hold their places before the journeys are announced. Nothing is charged today.",
    photo: "stringLights" satisfies PhotoKey,
    perks: [
      {
        title: "First look, six weeks early",
        body: "The full San Sebastián and Antigua itineraries, with the dates and the price, reach founding families six weeks before anything is public.",
      },
      {
        title: "First pick, held for fourteen days",
        body: "Choose your journey and your weeks before the public window opens, and hold the place with a fully refundable deposit for fourteen days while you decide. Nothing is charged today.",
      },
      {
        title: "Twenty minutes with the founder",
        body: "A call about your children's ages, what has worked on past trips and what has not. The 2027 programme is built around these calls.",
      },
      {
        title: "Bring your people",
        body: "Invite families you already travel well with. The group forms around you, not around strangers.",
      },
      {
        title: "Local gifts & photos",
        body: "A gift for every child, sourced from small businesses and makers in the destination, and a family photo shoot included for every family, so the summer comes home with you.",
      },
    ],
    form: {
      cta: "Request early access",
      microcopy: "We will send the first itineraries to this address and nothing else.",
    },
  },

  faq: {
    eyebrow: "Questions, answered",
    headline: { before: "What you'd ask us at the school gate." } as Headline,
    body: "Short answers. If yours is not here, reply to any email we send and a person will answer.",
    items: [
      {
        q: "Who is Avelune for?",
        a: "Families with children between roughly three and fourteen who travel well, are short on planning time, and want their kids to have a summer with other families that none of the parents had to organise. If you have done a resort kids' club and hated it, this is built for you.",
      },
      {
        q: "Do we travel with strangers?",
        a: "You travel with six to ten families we have matched to the same journey, and by the end of the first dinner they are not strangers. You can also bring families you already know; the group forms around you. Most groups will be a mix.",
      },
      {
        q: "What is actually included?",
        a: "All transfers in-country, private guides, the children's programme and hosts, and every activity on the itinerary. Accommodation is not included, but we offer recommendations and guides to help you find the right place to stay. Flights are not included either, but we advise on them. Full details come with the itineraries.",
      },
      {
        q: "Who looks after the children?",
        a: "A lead host and a team of counsellors with early-years, outdoor and first-aid training, background-checked, one team per age tier, travelling with the group for the whole ten days. Plan on roughly one host to four or five children, and one to two for the smallest; exact ratios are published with the itineraries. We introduce the team to you before departure, by name.",
      },
      {
        q: "My youngest is three. Will there be anything for them?",
        a: "Yes, and a host whose whole job is the three-to-fives. Short mornings, naps respected, the calm end of the beach, a courtyard to run around, the funicular twice. The programme is built so that the youngest sets nobody else's pace.",
      },
      {
        q: "Our teenager is not keen on family trips.",
        a: "Most are not, until the second day. Teenagers get their own hosts, their own surf progression or dawn climb, and a group of other teenagers. They are treated as travellers, not as children on a family holiday, and they get a say in the evening plan.",
      },
      {
        q: "When are the trips, and how long?",
        a: "Summer 2027, two to four weeks each. San Sebastián in June, Antigua in August. You can join one or both. Exact dates go to founding families first.",
      },
      {
        q: "What does it cost?",
        a: "We are not publishing pricing yet. Founding families see it first, with the full plan beside it, and hold places with a fully refundable deposit. Expect the price of a well-run private trip, with the planning and the hosts included.",
      },
      {
        q: "Can grandparents come?",
        a: "Yes. Multi-generational groups are welcome and the itinerary flexes for them. Tell us in the family step after you sign up.",
      },
    ],
  },

  finalCta: {
    eyebrow: "Summer 2027",
    headline: { before: "Say yes to the summer", accent: "now.", after: "Decide the details later." } as Headline,
    body: "Tell us where to send the first itineraries. One email when they are ready. Nothing before, nothing after.",
    honesty: "Avelune is a new company. Founding families are helping us build it.",
    photo: "antiguaStreetVolcano" satisfies PhotoKey,
    photoMobile: "arcoVolcan" satisfies PhotoKey,
  },

  signup: {
    emailLabel: "Email address",
    emailPlaceholder: "you@example.com",
    submitting: "One moment",
    already: {
      headline: "You are already on the list.",
      body: "Good. We will write once, when the first itineraries are ready. Nothing before, nothing after.",
    },
    success: {
      headline: "You are on the list.",
      body: "We will write once, when the first itineraries for San Sebastián and Antigua are ready, some time in the coming months. Until then, nothing. Expect a note from a person, not a sequence.",
      enrichPrompt: "Thirty seconds on your family, if you like. It shapes the programme.",
    },
    enrich: {
      nameLabel: "Your first name",
      agesLabel: "Children's ages",
      ages: [
        { value: "3–5", label: "3 to 5" },
        { value: "6–9", label: "6 to 9" },
        { value: "10–13", label: "10 to 13" },
        { value: "14–17", label: "14 to 17" },
      ],
      journeyLabel: "Which journey pulls harder",
      notesLabel: "Anything we should know",
      notesPlaceholder: "A grandparent, a dietary need, your home airport, families you'd bring, a kid who surfs.",
      privacyNote: "Ages are kept as bands, never names, and used only to shape the programme.",
      submit: "Send",
      skip: "Maybe later",
      saved: {
        headline: "Thank you.",
        body: "That helps more than you would think. You will hear from us when the itineraries are ready.",
      },
    },
  },

  footer: {
    line: "Summer journeys for families · ah-veh-LOON",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Photo credits", href: "/credits" },
    ],
    legal: "Avelune, 2026",
  },

  privacy: {
    title: "Privacy",
    updated: "October 2026",
    paragraphs: [
      "Avelune collects your email address when you request early access, and, if you choose to tell us, your first name, your children's ages as bands, which journey you prefer, and a free-text note. We use this to send you the first itineraries and to shape the programme. Nothing else.",
      "We store this on servers in the United States with our hosting and email providers, who act on our instructions. We do not sell or share your details with anyone for their own purposes, and we do not run advertising tracking on this site.",
      "We keep your details until you ask us to remove them or until the 2027 journeys are over and we no longer need them. Reply to any email from us, or write to the address below, to see, correct or delete what we hold, and we will do so within thirty days.",
      "Children's ages are collected only as bands (3 to 5, 6 to 9, 10 to 13, 14 to 17), never names, and only when a parent chooses to tell us.",
      "To protect the form from abuse we keep a hashed, salted version of the network address a request came from, which cannot be turned back into the address, for the life of the signup.",
    ],
  },

  deposit: {
    title: "Hold your place",
    eyebrow: "Founding families · refundable deposit",
    intro:
      "A fully refundable deposit holds your family's place on one 2027 journey for fourteen days while you decide. Nothing else is charged today.",
    emailLabel: "Email address",
    journeyLabel: "Which journey",
    submit: "Continue to payment",
    microcopy: "Payment is handled by Stripe. We never see your card details.",
    closed: "Deposits are not open yet. Founding families hear first, by email.",
    success: {
      title: "Your place is held.",
      body: "Your deposit has been received and your place is held for fourteen days. Reply to any email from us to release it and we will refund it in full. A receipt is on its way from Stripe.",
    },
    cancelled: {
      title: "No charge was made.",
      body: "Your place is not held. When you are ready, the deposit link in your email still works, and a person is one reply away.",
    },
  },

  credits: {
    title: "Photo credits",
    intro:
      "The photographs on this site are by the photographers below, used under the Unsplash License while Avelune commissions its own photography.",
    license: { before: "Photographs are used under the", linkLabel: "Unsplash License", url: "https://unsplash.com/license" },
  },
} as const

export type Site = typeof site
