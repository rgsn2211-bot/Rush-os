/* Rush OS — mock data. Plain JS, attached to window.RushData. All money in BHD (3 decimals). */
(function () {
  const money = (n) => n.toLocaleString("en-BH", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  const lastClosedDay = {
    date: "Sat, 14 Jun 2026",
    revenue: 642.350,
    cogs: 188.420,
    grossProfit: 453.930,
    netProfit: 271.110,
    cashDifference: -2.150,
    wasteValue: 14.380,
    alerts: 4,
    orders: 214,
    cashSales: 121.500,
    cardSales: 388.250,
    benefitPay: 96.600,
    deliverySales: 36.000,
    deliveryOrders: 12,
    discountTotal: 18.250,
  };

  const monthToDate = {
    label: "1–14 Jun 2026",
    revenue: 8642.900,
    cogs: 2533.110,
    expenses: 3120.000,
    grossProfit: 6109.790,
    netProfit: 2989.790,
    cashPosition: 1840.250,
    inventoryValue: 2415.600,
  };

  // 14-day revenue trend (oldest -> newest)
  const revenueTrend = [521, 488, 602, 575, 640, 712, 689, 533, 498, 610, 588, 655, 701, 642];

  const alerts = [
    { id: "a1", level: "urgent", cat: "Cash", title: "Cash difference over limit", detail: "Register short by 2.150 BHD on 14 Jun closing.", time: "Today, 9:12 AM", screen: "cash" },
    { id: "a2", level: "urgent", cat: "System", title: "Missing closing — 12 Jun", detail: "No daily closing submitted for Thursday.", time: "2 days ago", screen: "system" },
    { id: "a3", level: "warning", cat: "Inventory", title: "Low stock: Oat Milk", detail: "2 units left · below minimum of 6.", time: "Today, 8:40 AM", screen: "inv" },
    { id: "a4", level: "warning", cat: "Inventory", title: "Low stock: 12oz Cups", detail: "1 box left · 3 days remaining.", time: "Today, 8:40 AM", screen: "inv" },
    { id: "a5", level: "warning", cat: "Expiry", title: "Expiring soon: Fresh Milk", detail: "6 units expire in 2 days.", time: "Today, 8:00 AM", screen: "exp" },
    { id: "a6", level: "warning", cat: "Waste", title: "High waste day", detail: "Waste 14.380 BHD — 2.2% of revenue (target < 1.5%).", time: "Today, 9:12 AM", screen: "waste" },
    { id: "a7", level: "info", cat: "Cash", title: "Cash out pending review", detail: "Owner withdrawal 50.000 BHD logged by Sara.", time: "Yesterday", screen: "cash" },
    { id: "a8", level: "info", cat: "Sales", title: "BenefitPay above average", detail: "BenefitPay 15% of sales vs 11% avg.", time: "Yesterday", screen: "sales" },
  ];

  const inventory = [
    { id: "i1", name: "Fresh Milk", cat: "Dairy", stock: 18, base: "L", min: 12, days: 2, supplier: "Awal Dairy", status: "expiring", purchaseUnit: "case (12 L)", conv: "1 case = 12 L", expiry: "Required", safetyDays: 3, lead: 1, value: 9.0 },
    { id: "i2", name: "Oat Milk", cat: "Dairy Alt", stock: 2, base: "L", min: 6, days: 1, supplier: "Barista Supplies Co", status: "low", purchaseUnit: "case (6 L)", conv: "1 case = 6 L", expiry: "Required", safetyDays: 4, lead: 3, value: 4.4 },
    { id: "i3", name: "Ethiopia Beans", cat: "Coffee", stock: 4200, base: "g", min: 3000, days: 9, supplier: "Origin Roasters", status: "ok", purchaseUnit: "kg", conv: "1 kg = 1000 g", expiry: "Optional", safetyDays: 7, lead: 5, value: 71.4 },
    { id: "i4", name: "House Espresso Blend", cat: "Coffee", stock: 5600, base: "g", min: 4000, days: 11, supplier: "Origin Roasters", status: "ok", purchaseUnit: "kg", conv: "1 kg = 1000 g", expiry: "Optional", safetyDays: 7, lead: 5, value: 89.6 },
    { id: "i5", name: "12oz Cups", cat: "Packaging", stock: 50, base: "pc", min: 200, days: 3, supplier: "PackPro", status: "low", purchaseUnit: "box (1000 pc)", conv: "1 box = 1000 pc", expiry: "Not needed", safetyDays: 10, lead: 7, value: 1.5 },
    { id: "i6", name: "12oz Lids", cat: "Packaging", stock: 900, base: "pc", min: 200, days: 18, supplier: "PackPro", status: "ok", purchaseUnit: "box (1000 pc)", conv: "1 box = 1000 pc", expiry: "Not needed", safetyDays: 10, lead: 7, value: 18.0 },
    { id: "i7", name: "Vanilla Syrup", cat: "Syrups", stock: 3, base: "btl", min: 4, days: 6, supplier: "Barista Supplies Co", status: "low", purchaseUnit: "case (6 btl)", conv: "1 case = 6 btl", expiry: "Optional", safetyDays: 5, lead: 3, value: 7.5 },
    { id: "i8", name: "Chocolate Cookies", cat: "Bakery", stock: 24, base: "pc", min: 12, days: 2, supplier: "Daily Bake", status: "expiring", purchaseUnit: "tray (24 pc)", conv: "1 tray = 24 pc", expiry: "Required", safetyDays: 1, lead: 1, value: 4.8 },
    { id: "i9", name: "Matcha Powder", cat: "Tea", stock: 800, base: "g", min: 300, days: 22, supplier: "Origin Roasters", status: "ok", purchaseUnit: "tin (500 g)", conv: "1 tin = 500 g", expiry: "Optional", safetyDays: 7, lead: 5, value: 24.0 },
    { id: "i10", name: "Paper Bags", cat: "Packaging", stock: 320, base: "pc", min: 150, days: 14, supplier: "PackPro", status: "ok", purchaseUnit: "pack (250 pc)", conv: "1 pack = 250 pc", expiry: "Not needed", safetyDays: 10, lead: 7, value: 6.4 },
  ];

  const products = [
    { id: "p1", name: "V60 Cold Coffee", price: 1.500, cost: 0.410, recipe: [
      { item: "Ethiopia Beans", qty: 20, unit: "g", cost: 0.360 },
      { item: "12oz Cup", qty: 1, unit: "pc", cost: 0.030 },
      { item: "12oz Lid", qty: 1, unit: "pc", cost: 0.020 },
    ] },
    { id: "p2", name: "Flat White", price: 1.400, cost: 0.395, recipe: [
      { item: "House Espresso Blend", qty: 18, unit: "g", cost: 0.288 },
      { item: "Fresh Milk", qty: 0.15, unit: "L", cost: 0.057 },
      { item: "12oz Cup", qty: 1, unit: "pc", cost: 0.030 },
      { item: "12oz Lid", qty: 1, unit: "pc", cost: 0.020 },
    ] },
    { id: "p3", name: "Oat Latte", price: 1.700, cost: 0.512, recipe: [
      { item: "House Espresso Blend", qty: 18, unit: "g", cost: 0.288 },
      { item: "Oat Milk", qty: 0.2, unit: "L", cost: 0.174 },
      { item: "12oz Cup", qty: 1, unit: "pc", cost: 0.030 },
      { item: "12oz Lid", qty: 1, unit: "pc", cost: 0.020 },
    ] },
    { id: "p4", name: "Iced Matcha Latte", price: 1.900, cost: 0.486, recipe: [
      { item: "Matcha Powder", qty: 4, unit: "g", cost: 0.240 },
      { item: "Fresh Milk", qty: 0.2, unit: "L", cost: 0.076 },
      { item: "Vanilla Syrup", qty: 15, unit: "ml", cost: 0.120 },
      { item: "12oz Cup", qty: 1, unit: "pc", cost: 0.030 },
      { item: "12oz Lid", qty: 1, unit: "pc", cost: 0.020 },
    ] },
    { id: "p5", name: "Espresso", price: 0.800, cost: 0.288, recipe: [
      { item: "House Espresso Blend", qty: 18, unit: "g", cost: 0.288 },
    ] },
    { id: "p6", name: "Chocolate Cookie", price: 0.600, cost: 0.200, recipe: [
      { item: "Chocolate Cookies", qty: 1, unit: "pc", cost: 0.200 },
    ] },
  ];

  const expenses = [
    { id: "e1", date: "14 Jun", cat: "Supplier", amount: 84.000, method: "Card", who: "Origin Roasters", note: "Beans restock", receipt: true },
    { id: "e2", date: "13 Jun", cat: "Utilities", amount: 42.500, method: "Bank", who: "EWA", note: "Electricity", receipt: true },
    { id: "e3", date: "12 Jun", cat: "Maintenance", amount: 18.000, method: "Cash", who: "AC Tech", note: "Grinder service", receipt: false },
    { id: "e4", date: "11 Jun", cat: "Supplier", amount: 31.500, method: "Cash", who: "PackPro", note: "Cups & lids", receipt: true },
    { id: "e5", date: "10 Jun", cat: "Marketing", amount: 25.000, method: "Card", who: "Instagram Ads", note: "Weekend promo", receipt: true },
  ];

  const upcoming = [
    { id: "u1", name: "Shop Rent", amount: 650.000, due: "1 Jul 2026", every: "Monthly", type: "Rent" },
    { id: "u2", name: "Staff Salaries", amount: 1450.000, due: "28 Jun 2026", every: "Monthly", type: "Salaries" },
    { id: "u3", name: "Origin Roasters", amount: 220.000, due: "20 Jun 2026", every: "On invoice", type: "Supplier" },
    { id: "u4", name: "POS Subscription", amount: 18.000, due: "22 Jun 2026", every: "Monthly", type: "Subscription" },
    { id: "u5", name: "Espresso Machine Installment", amount: 95.000, due: "25 Jun 2026", every: "Monthly", type: "Installment" },
  ];

  const delivery = {
    month: "June 2026 (1–14)",
    grossSales: 512.000,
    orders: 168,
    commissionRate: 22,
    commission: 112.640,
    netPayout: 399.360,
    profitImpact: 86.420,
    apps: [
      { name: "Talabat", sales: 268.000, orders: 88, rate: 25, payout: 201.000 },
      { name: "Jahez", sales: 154.000, orders: 52, rate: 20, payout: 123.200 },
      { name: "Snoonu", sales: 90.000, orders: 28, rate: 17, payout: 74.700 },
    ],
  };

  const complimentary = [
    { id: "c1", date: "14 Jun", item: "Flat White", qty: 1, amount: 1.400, reason: "Customer remake", note: "Wrong milk, remade for guest" },
    { id: "c2", date: "14 Jun", item: "Chocolate Cookie", qty: 2, amount: 1.200, reason: "Staff", note: "Shift tasting" },
    { id: "c3", date: "13 Jun", item: "V60 Cold Coffee", qty: 1, amount: 1.500, reason: "Influencer", note: "Content collab" },
    { id: "c4", date: "13 Jun", item: "Espresso", qty: 3, amount: 2.400, reason: "Quality check", note: "Calibration shots" },
    { id: "c5", date: "12 Jun", item: "Oat Latte", qty: 1, amount: 1.700, reason: "Customer goodwill", note: "Long wait apology" },
  ];

  const waste = [
    { item: "Fresh Milk", type: "Inventory", qty: "500 ml", reason: "Spoiled" },
    { item: "12oz Cups", type: "Inventory", qty: "3 pc", reason: "Damaged" },
    { item: "Chocolate Cookies", type: "Inventory", qty: "4 pc", reason: "Expired" },
    { item: "V60 Cold Coffee", type: "Finished product", qty: "1 serving", reason: "Wrong preparation" },
  ];

  const wasteReasons = ["Expired", "Spoiled", "Damaged", "Wrong preparation", "Customer remake", "Over-prepared", "Staff mistake", "Testing", "Other"];

  const aiInsights = [
    {
      id: "ai1", priority: "High", title: "Milk waste is eating your margin",
      what: "Waste hit 2.2% of revenue on 14 Jun, driven mostly by spoiled Fresh Milk (500ml) and over-prepared cold brew.",
      why: "Fresh Milk is ordered in 12L cases but only ~9L/day is used midweek, so the tail of each case spoils before the next delivery.",
      actions: ["Switch midweek milk order to 6L half-cases", "Set a 2-day expiry alert on opened milk", "Prep cold brew to forecast, not max"],
      data: ["Waste log (14 days)", "Milk usage rate", "Daily order counts"],
    },
    {
      id: "ai2", priority: "Medium", title: "Oat Latte is underpriced for its cost",
      what: "Oat Latte margin is 70% vs 73% café average, and Oat Milk just hit low stock with a 3-day lead time.",
      why: "Oat Milk cost rose with the last PackPro invoice but the 1.700 BHD price hasn't moved in 4 months.",
      actions: ["Test 1.800 BHD price on Oat Latte", "Negotiate oat milk case pricing", "Promote Flat White as higher-margin default"],
      data: ["Product costing", "Inventory cost history", "Sales by item"],
    },
    {
      id: "ai3", priority: "Low", title: "BenefitPay share is climbing",
      what: "BenefitPay reached 15% of sales yesterday vs an 11% average over the month.",
      why: "Likely a shift in customer payment preference; no fee impact but affects cash float planning.",
      actions: ["Reduce daily register cash float by ~15 BHD", "Monitor for 1 more week before changing process"],
      data: ["EOD payment mix", "Cash count history"],
    },
  ];

  const checklist = [
    { id: "ck1", label: "Upload POS Sales by Item", done: true },
    { id: "ck2", label: "Upload Complimentary Report", done: true },
    { id: "ck3", label: "Enter EOD numbers", done: false },
    { id: "ck4", label: "Count cash", done: false },
    { id: "ck5", label: "Review cash out", done: false },
    { id: "ck6", label: "Submit daily closing", done: false },
  ];

  window.RushData = {
    money, lastClosedDay, monthToDate, revenueTrend, alerts, inventory, products,
    expenses, upcoming, delivery, complimentary, waste, wasteReasons, aiInsights, checklist,
  };
})();
