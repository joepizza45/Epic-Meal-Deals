/*
 * Epic Meal Deals — food knowledge base.
 *
 * Prices are TYPICAL US prices (2025–2026) and vary by location. They are
 * estimates used to rank value, not live menu data.
 *
 * Meal fields:
 *   name   – what to order
 *   price  – [low, high] typical price in USD for the whole item
 *   fill   – 1 (snack) .. 5 (you won't need dinner)
 *   serves – people it feeds (default 1); price is divided per person
 *   deal   – optional short note about why it's a deal
 */

const CUISINE_PROFILES = {
  mexican: {
    label: "Mexican / Tacos", emoji: "🌮", value: 92,
    meals: [
      { name: "3 street tacos", price: [5, 9], fill: 3 },
      { name: "Carne asada burrito", price: [9, 13], fill: 5, deal: "Basically two meals" },
      { name: "Torta", price: [9, 12], fill: 5 },
      { name: "Quesadilla plate w/ rice & beans", price: [10, 14], fill: 4 },
    ],
  },
  vietnamese: {
    label: "Vietnamese", emoji: "🍜", value: 88,
    meals: [
      { name: "Bánh mì", price: [6, 9], fill: 3, deal: "Cheapest great sandwich around" },
      { name: "Large bowl of phở", price: [12, 16], fill: 5 },
      { name: "Broken rice plate (cơm tấm)", price: [12, 16], fill: 5 },
      { name: "Vermicelli bowl", price: [12, 15], fill: 4 },
    ],
  },
  chinese: {
    label: "Chinese", emoji: "🥡", value: 85,
    meals: [
      { name: "Lunch special w/ rice & egg roll", price: [9, 13], fill: 5, deal: "Lunch specials are the move" },
      { name: "2-item combo plate", price: [8, 11], fill: 4 },
      { name: "Large fried rice or lo mein", price: [10, 14], fill: 5 },
      { name: "Dinner for two combo", price: [28, 38], fill: 5, serves: 2 },
    ],
  },
  thai: {
    label: "Thai", emoji: "🍛", value: 74,
    meals: [
      { name: "Pad thai lunch special", price: [11, 14], fill: 4 },
      { name: "Curry with jasmine rice", price: [13, 17], fill: 4 },
      { name: "Drunken noodles", price: [13, 17], fill: 4 },
    ],
  },
  indian: {
    label: "Indian / Nepali", emoji: "🍛", value: 82,
    meals: [
      { name: "All-you-can-eat lunch buffet", price: [13, 18], fill: 5, deal: "Unlimited plates" },
      { name: "Thali / combo plate", price: [13, 17], fill: 5 },
      { name: "Samosa chaat", price: [6, 9], fill: 3 },
      { name: "Chicken tikka masala w/ rice & naan", price: [16, 21], fill: 5 },
    ],
  },
  pizza: {
    label: "Pizza", emoji: "🍕", value: 88,
    meals: [
      { name: "Large 1-topping pizza", price: [10, 18], fill: 5, serves: 3, deal: "Feeds 3 for the price of one entrée" },
      { name: "2 slices + drink", price: [5, 8], fill: 3 },
      { name: "Lunch slice special", price: [4, 6], fill: 2 },
    ],
  },
  burger: {
    label: "Burgers", emoji: "🍔", value: 68,
    meals: [
      { name: "Burger combo w/ fries & drink", price: [9, 13], fill: 4 },
      { name: "Double cheeseburger", price: [5, 8], fill: 3 },
    ],
  },
  fast_food: {
    label: "Fast Food", emoji: "🍟", value: 70,
    meals: [
      { name: "Value combo meal", price: [5, 9], fill: 3 },
      { name: "Value menu item", price: [2, 4], fill: 2 },
    ],
  },
  sandwich: {
    label: "Sandwiches / Deli", emoji: "🥪", value: 74,
    meals: [
      { name: "Footlong / large sub", price: [10, 15], fill: 5, deal: "Split it or save half" },
      { name: "Half sandwich & soup", price: [9, 12], fill: 4 },
    ],
  },
  chicken: {
    label: "Fried Chicken", emoji: "🍗", value: 76,
    meals: [
      { name: "3-piece tenders combo", price: [9, 12], fill: 4 },
      { name: "2-piece chicken + 2 sides", price: [8, 11], fill: 4 },
      { name: "8-piece family meal w/ sides", price: [25, 35], fill: 5, serves: 4, deal: "Cheapest way to feed a family" },
    ],
  },
  bbq: {
    label: "BBQ", emoji: "🍖", value: 66,
    meals: [
      { name: "Pulled pork sandwich + side", price: [11, 15], fill: 4 },
      { name: "Two-meat plate w/ sides", price: [17, 24], fill: 5 },
      { name: "Pound of brisket", price: [26, 34], fill: 5, serves: 3 },
    ],
  },
  korean: {
    label: "Korean", emoji: "🥘", value: 66,
    meals: [
      { name: "Bibimbap", price: [14, 18], fill: 4 },
      { name: "All-you-can-eat Korean BBQ", price: [25, 35], fill: 5, deal: "Unlimited meat" },
      { name: "Half order Korean fried chicken", price: [18, 24], fill: 4, serves: 2 },
    ],
  },
  japanese: {
    label: "Japanese", emoji: "🍱", value: 58,
    meals: [
      { name: "Teriyaki chicken plate", price: [11, 14], fill: 5 },
      { name: "Bento box lunch", price: [13, 18], fill: 4 },
      { name: "Ramen bowl", price: [14, 18], fill: 4 },
    ],
  },
  sushi: {
    label: "Sushi", emoji: "🍣", value: 45,
    meals: [
      { name: "Lunch 2-roll combo", price: [12, 16], fill: 3 },
      { name: "All-you-can-eat sushi", price: [28, 38], fill: 5, deal: "Only a deal if you're hungry" },
    ],
  },
  mediterranean: {
    label: "Mediterranean / Halal", emoji: "🥙", value: 86,
    meals: [
      { name: "Chicken over rice", price: [9, 13], fill: 5, deal: "Huge portions" },
      { name: "Falafel wrap", price: [8, 11], fill: 4 },
      { name: "Shawarma wrap", price: [9, 12], fill: 4 },
      { name: "Gyro platter", price: [12, 16], fill: 5 },
    ],
  },
  ethiopian: {
    label: "Ethiopian", emoji: "🫓", value: 78,
    meals: [
      { name: "Veggie combo platter (shareable)", price: [16, 22], fill: 5, serves: 2 },
      { name: "Tibs with injera", price: [16, 20], fill: 5 },
    ],
  },
  caribbean: {
    label: "Caribbean", emoji: "🌶️", value: 84,
    meals: [
      { name: "Jerk chicken w/ rice & peas", price: [12, 16], fill: 5 },
      { name: "Beef patty", price: [3, 5], fill: 2 },
      { name: "Small oxtail plate", price: [16, 22], fill: 5 },
    ],
  },
  latin: {
    label: "Latin American", emoji: "🫔", value: 85,
    meals: [
      { name: "Pupusas (3)", price: [7, 10], fill: 4, deal: "Cheap and filling" },
      { name: "Rice, beans & meat plate", price: [12, 16], fill: 5 },
      { name: "Cuban sandwich", price: [10, 13], fill: 4 },
      { name: "Half rotisserie chicken w/ sides", price: [14, 18], fill: 5 },
    ],
  },
  filipino: {
    label: "Filipino", emoji: "🍚", value: 80,
    meals: [
      { name: "2-item combo plate", price: [11, 14], fill: 5 },
      { name: "Silog breakfast plate", price: [11, 14], fill: 5 },
    ],
  },
  diner: {
    label: "Diner / Breakfast", emoji: "🥞", value: 76,
    meals: [
      { name: "Two eggs, hash browns & toast", price: [9, 13], fill: 4 },
      { name: "Pancake stack", price: [8, 11], fill: 4 },
      { name: "Blue plate special", price: [13, 17], fill: 5 },
    ],
  },
  soul: {
    label: "Southern / Cajun", emoji: "🍲", value: 78,
    meals: [
      { name: "Meat + 2 sides", price: [12, 16], fill: 5 },
      { name: "Po' boy", price: [11, 15], fill: 4 },
      { name: "Red beans & rice", price: [8, 11], fill: 4 },
    ],
  },
  noodle: {
    label: "Asian / Noodles", emoji: "🍜", value: 72,
    meals: [
      { name: "Noodle bowl", price: [11, 15], fill: 4 },
      { name: "Rice plate", price: [11, 14], fill: 4 },
    ],
  },
  hot_dog: {
    label: "Hot Dogs", emoji: "🌭", value: 84,
    meals: [
      { name: "2 dogs + fries", price: [7, 10], fill: 4 },
      { name: "Chili dog", price: [4, 6], fill: 2 },
    ],
  },
  buffet: {
    label: "Buffet", emoji: "🍽️", value: 86,
    meals: [
      { name: "All-you-can-eat lunch buffet", price: [12, 17], fill: 5, deal: "Unlimited plates" },
      { name: "Dinner buffet", price: [15, 22], fill: 5 },
    ],
  },
  italian: {
    label: "Italian", emoji: "🍝", value: 58,
    meals: [
      { name: "Pasta lunch special", price: [13, 17], fill: 4 },
      { name: "Family-style pasta tray", price: [40, 60], fill: 5, serves: 4 },
    ],
  },
  seafood: {
    label: "Seafood", emoji: "🦐", value: 50,
    meals: [
      { name: "Fried shrimp basket", price: [13, 18], fill: 4 },
      { name: "Fish & chips", price: [14, 19], fill: 4 },
    ],
  },
  steak: {
    label: "Steakhouse", emoji: "🥩", value: 38,
    meals: [{ name: "Lunch sirloin special", price: [15, 22], fill: 4 }],
  },
  food_court: {
    label: "Food Court", emoji: "🍱", value: 78,
    meals: [{ name: "Combo plate", price: [9, 13], fill: 4 }],
  },
  dessert: {
    label: "Sweets & Snacks", emoji: "🍩", value: 30,
    meals: [{ name: "Treat / snack", price: [3, 7], fill: 1 }],
  },
  american: {
    label: "American", emoji: "🍽️", value: 55,
    meals: [
      { name: "Lunch special", price: [12, 16], fill: 4 },
      { name: "Burger & fries", price: [13, 17], fill: 4 },
      { name: "Happy hour appetizer", price: [6, 10], fill: 2 },
    ],
  },
};

/* OSM `cuisine=*` values → profile key. */
const CUISINE_MAP = {
  mexican: "mexican", "tex-mex": "mexican", tex_mex: "mexican", taco: "mexican", tacos: "mexican", burrito: "mexican",
  vietnamese: "vietnamese", pho: "vietnamese", banh_mi: "vietnamese",
  chinese: "chinese", cantonese: "chinese", szechuan: "chinese", sichuan: "chinese", dim_sum: "chinese", hunan: "chinese", taiwanese: "chinese", dumpling: "chinese",
  thai: "thai", laotian: "thai", lao: "thai",
  indian: "indian", nepalese: "indian", nepali: "indian", pakistani: "indian", bangladeshi: "indian", curry: "indian", himalayan: "indian",
  pizza: "pizza",
  burger: "burger",
  sandwich: "sandwich", deli: "sandwich", sub: "sandwich", bagel: "sandwich", subs: "sandwich",
  chicken: "chicken", fried_chicken: "chicken", wings: "chicken", chicken_wings: "chicken",
  bbq: "bbq", barbecue: "bbq", smokehouse: "bbq",
  korean: "korean",
  japanese: "japanese", ramen: "japanese", teriyaki: "japanese", udon: "japanese",
  sushi: "sushi", poke: "sushi",
  mediterranean: "mediterranean", greek: "mediterranean", kebab: "mediterranean", middle_eastern: "mediterranean", lebanese: "mediterranean",
  turkish: "mediterranean", falafel: "mediterranean", halal: "mediterranean", persian: "mediterranean", afghan: "mediterranean", arab: "mediterranean", shawarma: "mediterranean", gyro: "mediterranean",
  ethiopian: "ethiopian", eritrean: "ethiopian", african: "ethiopian",
  caribbean: "caribbean", jamaican: "caribbean", haitian: "caribbean", trinidadian: "caribbean",
  latin_american: "latin", salvadoran: "latin", peruvian: "latin", colombian: "latin", cuban: "latin", dominican: "latin", puerto_rican: "latin",
  venezuelan: "latin", brazilian: "latin", honduran: "latin", guatemalan: "latin", arepa: "latin", empanada: "latin",
  filipino: "filipino",
  diner: "diner", breakfast: "diner", american_breakfast: "diner", pancake: "diner", brunch: "diner", waffle: "diner",
  soul_food: "soul", cajun: "soul", creole: "soul", southern: "soul",
  noodle: "noodle", asian: "noodle", malaysian: "noodle", indonesian: "noodle", burmese: "noodle", cambodian: "noodle", hawaiian: "noodle", fusion: "noodle",
  hot_dog: "hot_dog",
  buffet: "buffet",
  italian: "italian", pasta: "italian",
  seafood: "seafood", fish_and_chips: "seafood", fish: "seafood", crab: "seafood",
  steak_house: "steak", steak: "steak", steakhouse: "steak",
  ice_cream: "dessert", donut: "dessert", dessert: "dessert", frozen_yogurt: "dessert", coffee_shop: "dessert", bubble_tea: "dessert", cake: "dessert", crepe: "dessert", juice: "dessert",
  american: "american", regional: "american", grill: "american", french: "italian", spanish: "italian", german: "american",
};

/* Name keywords → profile key, for places without a cuisine tag. */
const NAME_KEYWORDS = [
  [/taquer|taco|burrito|cantina|mexican|tortill|carnitas|tamale/i, "mexican"],
  [/\bpho\b|ph[oở]\b|banh mi|vietnam|saigon|hanoi/i, "vietnamese"],
  [/pizza|pizzeria|slice/i, "pizza"],
  [/buffet|all you can eat|ayce/i, "buffet"],
  [/halal|gyro|shawarma|kebab|kabob|falafel|mediterr|greek/i, "mediterranean"],
  [/pupus|arepa|empanad|cuban|peruvian|salvador|latin/i, "latin"],
  [/jerk|jamaica|caribbean|island/i, "caribbean"],
  [/wok|china|chinese|panda|dragon|dumpling|szechuan|hunan|golden/i, "chinese"],
  [/curry|tandoor|india|masala|biryani/i, "indian"],
  [/thai|bangkok/i, "thai"],
  [/ramen|sushi|teriyaki|hibachi|japan/i, "japanese"],
  [/korea|bulgogi|bibimbap/i, "korean"],
  [/bbq|barbecue|smokehouse|brisket/i, "bbq"],
  [/chicken|wings|tenders/i, "chicken"],
  [/burger/i, "burger"],
  [/hot dog|frank/i, "hot_dog"],
  [/deli|sub|sandwich|hoagie|bagel/i, "sandwich"],
  [/diner|pancake|waffle|breakfast|griddle/i, "diner"],
  [/noodle|asian/i, "noodle"],
  [/seafood|crab|fish|oyster|shrimp/i, "seafood"],
  [/steak/i, "steak"],
  [/donut|doughnut|ice cream|creamery|yogurt|bakery|boba|coffee|cafe|caf[eé]/i, "dessert"],
];

/*
 * Chains with well-known value deals. Matched against OSM `brand` / `name`.
 * Deal names and prices change — these are typical, check the app or menu.
 */
const CHAINS = [
  { match: /costco/i, name: "Costco Food Court", emoji: "🌭", value: 99, meals: [
    { name: "Hot dog + soda", price: [1.5, 1.5], fill: 4, deal: "Same $1.50 price since 1985" },
    { name: "Pizza slice", price: [1.99, 1.99], fill: 3 },
    { name: "Whole 18\" pizza", price: [9.95, 9.95], fill: 5, serves: 4, deal: "Legendary value" },
  ]},
  { match: /little caesars/i, name: "Little Caesars", emoji: "🍕", value: 95, meals: [
    { name: "Hot-N-Ready large pepperoni", price: [6, 8], fill: 5, serves: 3, deal: "Ready-to-go, no wait" },
    { name: "Crazy Combo (Crazy Bread + sauce)", price: [4, 5], fill: 2 },
  ]},
  { match: /taco bell/i, name: "Taco Bell", emoji: "🌮", value: 90, meals: [
    { name: "Cravings Value Menu items", price: [1.5, 3], fill: 2 },
    { name: "Luxe Cravings Box", price: [7, 9], fill: 5, deal: "4 items + drink" },
    { name: "Cheesy Gordita Crunch", price: [4, 5.5], fill: 3 },
  ]},
  { match: /mcdonald/i, name: "McDonald's", emoji: "🍟", value: 82, meals: [
    { name: "$5 Meal Deal (McDouble/McChicken, 4pc nugs, fries, drink)", price: [5, 6.5], fill: 4, deal: "Check the app for extra deals" },
    { name: "McDouble", price: [2.5, 3.5], fill: 2 },
  ]},
  { match: /wendy/i, name: "Wendy's", emoji: "🍔", value: 84, meals: [
    { name: "Biggie Bag", price: [5, 7], fill: 4, deal: "Burger, nuggets, fries & drink" },
    { name: "4 for $4 / value meal", price: [4, 5], fill: 3 },
  ]},
  { match: /burger king/i, name: "Burger King", emoji: "🍔", value: 80, meals: [
    { name: "$5 Your Way Meal", price: [5, 6], fill: 4 },
    { name: "Whopper combo", price: [9, 11], fill: 4 },
  ]},
  { match: /chipotle/i, name: "Chipotle", emoji: "🌯", value: 78, meals: [
    { name: "Burrito bowl (double the rice & beans)", price: [9, 12], fill: 5, deal: "Free toppings = huge bowl" },
  ]},
  { match: /qdoba/i, name: "Qdoba", emoji: "🌯", value: 77, meals: [
    { name: "Burrito (queso & guac included)", price: [10, 13], fill: 5 },
  ]},
  { match: /panda express/i, name: "Panda Express", emoji: "🥡", value: 78, meals: [
    { name: "Plate (2 entrées + side)", price: [10, 12], fill: 5 },
    { name: "Bowl (1 entrée + side)", price: [8.5, 10], fill: 4 },
    { name: "Family meal", price: [38, 45], fill: 5, serves: 4 },
  ]},
  { match: /subway/i, name: "Subway", emoji: "🥪", value: 76, meals: [
    { name: "Footlong deal", price: [7, 10], fill: 5, deal: "Watch the app for footlong promos" },
    { name: "6-inch sub", price: [5, 7], fill: 3 },
  ]},
  { match: /jersey mike/i, name: "Jersey Mike's", emoji: "🥪", value: 72, meals: [
    { name: "Giant sub (split it)", price: [14, 18], fill: 5, serves: 2 },
    { name: "Regular sub", price: [9, 12], fill: 4 },
  ]},
  { match: /firehouse/i, name: "Firehouse Subs", emoji: "🥪", value: 70, meals: [
    { name: "Large sub", price: [12, 15], fill: 5 },
  ]},
  { match: /raising cane/i, name: "Raising Cane's", emoji: "🍗", value: 76, meals: [
    { name: "The Box Combo", price: [11, 13], fill: 5 },
    { name: "Caniac Combo (share it)", price: [16, 19], fill: 5, serves: 2 },
  ]},
  { match: /in-n-out|in n out/i, name: "In-N-Out", emoji: "🍔", value: 90, meals: [
    { name: "Double-Double combo", price: [9, 11], fill: 4, deal: "Fresh, cheap, and famous" },
    { name: "Double-Double", price: [5, 6.5], fill: 3 },
  ]},
  { match: /waffle house/i, name: "Waffle House", emoji: "🧇", value: 86, meals: [
    { name: "All-Star Special", price: [10, 13], fill: 5, deal: "Waffle, eggs, meat, hashbrowns & toast" },
    { name: "Hashbrowns scattered, smothered & covered", price: [4, 6], fill: 3 },
  ]},
  { match: /popeyes/i, name: "Popeyes", emoji: "🍗", value: 80, meals: [
    { name: "Chicken sandwich combo", price: [8, 10], fill: 4 },
    { name: "2pc chicken combo", price: [8, 10], fill: 4 },
  ]},
  { match: /\bkfc\b|kentucky fried/i, name: "KFC", emoji: "🍗", value: 78, meals: [
    { name: "Fill Up box", price: [7, 9], fill: 4 },
    { name: "8pc bucket meal", price: [28, 35], fill: 5, serves: 4 },
  ]},
  { match: /chick-fil-a|chick fil a/i, name: "Chick-fil-A", emoji: "🐔", value: 70, meals: [
    { name: "Chicken sandwich meal", price: [9, 11], fill: 4 },
  ]},
  { match: /church'?s/i, name: "Church's Texas Chicken", emoji: "🍗", value: 82, meals: [
    { name: "2pc combo", price: [7, 9], fill: 4 },
    { name: "8pc family meal", price: [25, 30], fill: 5, serves: 4 },
  ]},
  { match: /bojangles/i, name: "Bojangles", emoji: "🍗", value: 78, meals: [{ name: "Bo's combo", price: [8, 10], fill: 4 }] },
  { match: /zaxby/i, name: "Zaxby's", emoji: "🍗", value: 70, meals: [{ name: "Chicken finger plate", price: [10, 13], fill: 5 }] },
  { match: /wingstop/i, name: "Wingstop", emoji: "🍗", value: 64, meals: [{ name: "Boneless wing combo", price: [10, 13], fill: 4 }] },
  { match: /domino/i, name: "Domino's", emoji: "🍕", value: 90, meals: [
    { name: "Mix & Match deal (2+ items)", price: [6.99, 7.99], fill: 4, deal: "Each item; order 2 or more" },
    { name: "Carryout large 3-topping", price: [9.99, 11.99], fill: 5, serves: 3 },
  ]},
  { match: /pizza hut/i, name: "Pizza Hut", emoji: "🍕", value: 84, meals: [
    { name: "Deal Lover's menu item", price: [7, 9], fill: 4 },
    { name: "Big Dinner Box", price: [25, 30], fill: 5, serves: 4 },
  ]},
  { match: /papa john/i, name: "Papa John's", emoji: "🍕", value: 84, meals: [
    { name: "Papa Pairings (2+ items)", price: [6.99, 7.99], fill: 4 },
    { name: "Large 1-topping", price: [12, 15], fill: 5, serves: 3 },
  ]},
  { match: /papa murphy/i, name: "Papa Murphy's", emoji: "🍕", value: 82, meals: [
    { name: "Take 'N' Bake large", price: [11, 15], fill: 5, serves: 3 },
  ]},
  { match: /jack in the box/i, name: "Jack in the Box", emoji: "🍔", value: 82, meals: [
    { name: "2 tacos", price: [1.99, 2.5], fill: 2, deal: "Late-night classic" },
    { name: "Jack's value combo", price: [5, 7], fill: 4 },
  ]},
  { match: /del taco/i, name: "Del Taco", emoji: "🌮", value: 86, meals: [
    { name: "Value menu tacos & burritos", price: [1.5, 3], fill: 2 },
    { name: "Epic burrito", price: [6, 8], fill: 5 },
  ]},
  { match: /el pollo loco/i, name: "El Pollo Loco", emoji: "🍗", value: 80, meals: [
    { name: "2pc chicken meal", price: [9, 11], fill: 4 },
    { name: "8pc family meal", price: [28, 35], fill: 5, serves: 4 },
  ]},
  { match: /whataburger/i, name: "Whataburger", emoji: "🍔", value: 72, meals: [{ name: "Whataburger combo", price: [9, 11], fill: 5 }] },
  { match: /culver/i, name: "Culver's", emoji: "🍔", value: 72, meals: [{ name: "ButterBurger value basket", price: [9, 11], fill: 4 }] },
  { match: /sonic/i, name: "Sonic Drive-In", emoji: "🌭", value: 78, meals: [
    { name: "Corn dog", price: [1.5, 2.5], fill: 2 },
    { name: "Combo meal", price: [8, 10], fill: 4 },
  ]},
  { match: /white castle/i, name: "White Castle", emoji: "🍔", value: 80, meals: [
    { name: "4 sliders + fries", price: [8, 10], fill: 4 },
  ]},
  { match: /dairy queen|\bdq\b/i, name: "Dairy Queen", emoji: "🍦", value: 78, meals: [
    { name: "$7 Meal Deal (burger, fries, drink, sundae)", price: [7, 8], fill: 4, deal: "Comes with dessert" },
  ]},
  { match: /arby/i, name: "Arby's", emoji: "🥪", value: 72, meals: [{ name: "2 for deal sandwiches", price: [7, 9], fill: 4 }] },
  { match: /carl'?s jr|hardee/i, name: "Carl's Jr. / Hardee's", emoji: "🍔", value: 70, meals: [{ name: "Famous Star combo", price: [9, 11], fill: 4 }] },
  { match: /five guys/i, name: "Five Guys", emoji: "🍔", value: 40, meals: [{ name: "Little burger + regular fries (split fries)", price: [13, 16], fill: 4 }] },
  { match: /shake shack/i, name: "Shake Shack", emoji: "🍔", value: 42, meals: [{ name: "ShackBurger + fries", price: [12, 15], fill: 4 }] },
  { match: /golden corral/i, name: "Golden Corral", emoji: "🍽️", value: 86, meals: [
    { name: "All-you-can-eat buffet", price: [13, 18], fill: 5, deal: "Unlimited plates + dessert bar" },
  ]},
  { match: /cicis|cici'?s/i, name: "Cicis Pizza", emoji: "🍕", value: 90, meals: [
    { name: "Pizza buffet", price: [8, 11], fill: 5, deal: "All-you-can-eat pizza" },
  ]},
  { match: /denny'?s/i, name: "Denny's", emoji: "🥞", value: 74, meals: [
    { name: "Value Slam", price: [7, 9], fill: 4 },
    { name: "Grand Slam", price: [10, 13], fill: 5 },
  ]},
  { match: /ihop/i, name: "IHOP", emoji: "🥞", value: 72, meals: [{ name: "House Favorites combo", price: [8, 12], fill: 5 }] },
  { match: /cracker barrel/i, name: "Cracker Barrel", emoji: "🍳", value: 70, meals: [{ name: "Homestyle dinner plate", price: [13, 17], fill: 5 }] },
  { match: /ikea/i, name: "IKEA Restaurant", emoji: "🍽️", value: 92, meals: [
    { name: "Swedish meatballs plate", price: [6, 8], fill: 4, deal: "Cheap & surprisingly good" },
    { name: "Hot dog", price: [1, 1.5], fill: 2 },
  ]},
  { match: /california pizza kitchen|\bcpk\b/i, name: "California Pizza Kitchen", emoji: "🍕", value: 45, meals: [
    { name: "Hand-tossed pizza", price: [17, 22], fill: 4 },
  ]},
  { match: /panera/i, name: "Panera Bread", emoji: "🥖", value: 52, meals: [{ name: "You Pick Two", price: [11, 14], fill: 4 }] },
  { match: /noodles & company|noodles and company/i, name: "Noodles & Company", emoji: "🍜", value: 62, meals: [{ name: "Regular noodle bowl", price: [9, 12], fill: 4 }] },
  { match: /jollibee/i, name: "Jollibee", emoji: "🍗", value: 82, meals: [{ name: "Chickenjoy 2pc w/ rice", price: [8, 11], fill: 5 }] },
];

/* Day-of-week deal tips (general patterns, not guarantees). */
const DAY_TIPS = [
  "🍗 Sunday: lots of family restaurants run kids-eat-free or family-meal deals — call ahead.",
  "🍕 Monday: slow night = pizza carryout deals. Check your local chain apps.",
  "🌮 Tuesday: it's Taco Tuesday. Many taquerias drop taco prices today.",
  "🍗 Wednesday: Wing Wednesday + half-off appetizers at a lot of bars & grills.",
  "🍔 Thursday: burger-night specials are common — ask about weekday deals.",
  "🐟 Friday: fish-fry Fridays and happy hour food menus are your friends.",
  "🥞 Saturday: big breakfast is the best-value meal of the weekend. Diners FTW.",
];
