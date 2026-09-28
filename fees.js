// splitpot platform fee
// Load after supabase.js. Reads fee tiers from the database so every
// calculator matches what settle_room actually charges.
(function () {
  // Fallback until the database answers (amounts in kobo)
  let tiers = [
    { min: 0, percent: 15 },
    { min: 500000, percent: 10 }
  ];

  // potKobo -> { percent, fee } with fee in kobo, rounded down like the database
  window.splitpotFee = function (potKobo) {
    let percent = 0;
    tiers.forEach((tier) => {
      if (potKobo >= tier.min) percent = tier.percent;
    });
    return { percent, fee: Math.floor((potKobo * percent) / 100) };
  };

  window.splitpotFeeReady = (async () => {
    if (!window.sb) return;
    try {
      const { data, error } = await sb.from("fee_tiers").select("min_pot, percent").order("min_pot");
      if (!error && data && data.length) {
        tiers = data.map((row) => ({ min: Number(row.min_pot), percent: row.percent }));
      }
    } catch (err) {
      console.error("Could not load fee tiers:", err);
    }
  })();
})();
