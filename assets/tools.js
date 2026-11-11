// Small interactive tools for blog posts. A post opts in with <div class="tool" data-tool="..." data-lang="en|pt"></div>.
// No tracking beyond one GA event per tool; detox progress stays in this browser only.
(function () {
  var CUBE = 4; // grams of sugar in one sugar cube / teaspoon
  var T = {
    en: {
      title: "Your daily added sugar", sub: "Tap what you had on a typical day.",
      limit: "Daily limit", women: "Women (25 g)", men: "Men (36 g)", kids: "Kids (25 g)",
      grams: "grams of added sugar", cubes: "sugar cubes", of: "of your daily limit", year: "a year at this pace",
      ok: "Nicely under the limit. Keep it there.", near: "Close to the limit. One swap a day makes a big difference.",
      over: "Over the limit. Start with the biggest item on your list.",
      note: "Typical US label values. Check your own labels: 4 g of added sugar is about one cube.",
      items: [["Can of soda (12 oz)", 39], ["Sweet coffee drink", 30], ["Candy bar", 25], ["Glass of juice drink", 24],
        ["Flavored yogurt", 12], ["Bowl of sweet cereal", 12], ["Cookie", 8], ["Scoop of ice cream", 14], ["Spoon of sugar in tea", 4], ["Granola bar", 9]]
    },
    pt: {
      title: "Seu açúcar adicionado por dia", sub: "Toque no que você consumiu num dia comum.",
      limit: "Limite diário", women: "Mulheres (25 g)", men: "Homens (36 g)", kids: "Crianças (25 g)",
      grams: "gramas de açúcar adicionado", cubes: "cubos de açúcar", of: "do seu limite diário", year: "por ano nesse ritmo",
      ok: "Bem abaixo do limite. Continue assim.", near: "Perto do limite. Uma troca por dia já faz muita diferença.",
      over: "Acima do limite. Comece pelo item maior da sua lista.",
      note: "Valores típicos de rótulos. Confira os seus: 4 g de açúcar adicionado equivalem a cerca de um cubo.",
      items: [["Lata de refrigerante (350 ml)", 37], ["Café adoçado ou cappuccino", 25], ["Barra de chocolate", 25], ["Copo de suco de caixinha", 22],
        ["Iogurte com sabor", 12], ["Tigela de cereal açucarado", 12], ["Biscoito recheado (3 un.)", 15], ["Bola de sorvete", 14], ["Colher de açúcar no café", 4], ["Brigadeiro", 8]]
    }
  };

  function ev(name) { try { window.gtag && gtag("event", "tool_used", { tool: name }); } catch (e) {} }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function cubes(box, g, limit) {
    box.textContent = "";
    var n = Math.round(g / CUBE), lim = Math.round(limit / CUBE);
    for (var i = 0; i < Math.min(n, 60); i++) box.appendChild(el("i", i >= lim ? "over" : ""));
    if (n > 60) box.appendChild(el("span", "more-cubes", "+" + (n - 60)));
  }

  function sugarCalc(root, L) {
    var s = T[L] || T.en, counts = s.items.map(function () { return 0; }), limit = 25, used = false;
    root.appendChild(el("p", "tool-h", s.title));
    root.appendChild(el("p", "tool-sub", s.sub));
    var lim = el("div", "seg"); lim.setAttribute("role", "group"); lim.setAttribute("aria-label", s.limit);
    [[s.women, 25], [s.men, 36], [s.kids, 25]].forEach(function (o, i) {
      var b = el("button", i === 0 ? "on" : "", o[0]); b.type = "button";
      b.onclick = function () { limit = o[1]; [].forEach.call(lim.children, function (c) { c.classList.remove("on"); }); b.classList.add("on"); draw(); };
      lim.appendChild(b);
    });
    root.appendChild(lim);
    var list = el("ul", "items");
    s.items.forEach(function (it, i) {
      var li = el("li"), name = el("span", "nm", it[0]), g = el("small", "", it[1] + " g");
      var minus = el("button", "st", "−"), plus = el("button", "st", "+"), n = el("b", "n", "0");
      minus.type = plus.type = "button"; minus.setAttribute("aria-label", "−1 " + it[0]); plus.setAttribute("aria-label", "+1 " + it[0]);
      minus.onclick = function () { counts[i] = Math.max(0, counts[i] - 1); n.textContent = counts[i]; draw(); };
      plus.onclick = function () { counts[i] = Math.min(9, counts[i] + 1); n.textContent = counts[i]; draw(); if (!used) { used = true; ev("sugar_calc"); } };
      name.appendChild(g); li.append(name, minus, n, plus); list.appendChild(li);
    });
    root.appendChild(list);
    var out = el("div", "out"), big = el("p", "big"), cb = el("div", "cubes"), verdict = el("p", "verdict");
    out.setAttribute("aria-live", "polite"); out.append(big, cb, verdict); root.appendChild(out);
    root.appendChild(el("p", "tool-note", s.note));
    function draw() {
      var g = counts.reduce(function (a, c, i) { return a + c * s.items[i][1]; }, 0), pct = Math.round(g / limit * 100);
      big.innerHTML = "<b>" + g + "</b> " + s.grams + " · <b>" + Math.round(g / CUBE) + "</b> " + s.cubes +
        " · <b>" + pct + "%</b> " + s.of + "<br><small>" + (g * 365 / 1000).toFixed(1) + " kg " + s.year + "</small>";
      cubes(cb, g, limit);
      verdict.textContent = g === 0 ? "" : pct <= 70 ? s.ok : pct <= 100 ? s.near : s.over;
      verdict.className = "verdict " + (pct <= 70 ? "good" : pct <= 100 ? "mid" : "bad");
    }
    draw();
  }

  function drinkCubes(root) {
    var drinks = [["Coca-Cola, 12 oz can", 39], ["Coca-Cola, 20 oz bottle", 65], ["Pepsi, 12 oz can", 41], ["Sprite, 12 oz can", 38],
      ["Dr Pepper, 12 oz can", 39], ["Mountain Dew, 12 oz can", 46], ["Red Bull, 8.4 oz can", 27], ["Coke Zero / Diet Coke", 0]];
    root.appendChild(el("p", "tool-h", "Pick a drink, see the sugar cubes"));
    var row = el("div", "chips"), out = el("div", "out"), big = el("p", "big"), cb = el("div", "cubes"), used = false;
    out.setAttribute("aria-live", "polite");
    drinks.forEach(function (d, i) {
      var b = el("button", i === 0 ? "on" : "", d[0]); b.type = "button";
      b.onclick = function () { [].forEach.call(row.children, function (c) { c.classList.remove("on"); }); b.classList.add("on"); show(d); if (!used) { used = true; ev("drink_cubes"); } };
      row.appendChild(b);
    });
    out.append(big, cb); root.append(row, out);
    root.appendChild(el("p", "tool-note", "Values from US nutrition labels. One cube is about 4 g. Red cubes go past the 25 g daily limit the American Heart Association suggests for women."));
    function show(d) {
      big.innerHTML = d[1] ? "<b>" + d[1] + " g</b> of sugar · about <b>" + Math.round(d[1] / CUBE) + " sugar cubes</b>" : "<b>0 g</b> of sugar · no cubes";
      cubes(cb, d[1], 25);
    }
    show(drinks[0]);
  }

  function detoxPlan(root) {
    var days = [
      ["Day 1", "Find your sources", "Read the labels of 5 things you eat often and note the added sugar."],
      ["Day 2", "Swap your drink", "Replace one sweet drink with water, sparkling water or unsweetened tea."],
      ["Day 3", "Protein breakfast", "Start the day with eggs, yogurt, beans or nuts instead of a sweet breakfast."],
      ["Day 4", "Plan the danger zone", "Pick your craving time and write an if-then plan for it."],
      ["Day 5", "Clear the reach", "Move sweets out of sight and put fruit and nuts where they were."],
      ["Day 6", "Ride one wave", "When a craving hits, breathe slowly for 2 minutes or take a 15 minute walk."],
      ["Day 7", "Notice the change", "Taste a piece of fruit slowly. Write down what feels different."]
    ];
    var KEY = "pipgrove-detox", done = {};
    try { done = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
    root.appendChild(el("p", "tool-h", "Your 7-day sugar detox checklist"));
    var bar = el("div", "prog"), fill = el("i"), lbl = el("p", "tool-sub");
    bar.appendChild(fill); root.append(bar, lbl);
    var list = el("ul", "plan");
    days.forEach(function (d, i) {
      var li = el("li"), id = "dx" + i + Math.random().toString(36).slice(2, 6), cb = el("input"), lab = el("label");
      cb.type = "checkbox"; cb.id = id; cb.checked = !!done[i]; lab.htmlFor = id;
      lab.innerHTML = "<b>" + d[0] + ": " + d[1] + "</b><span>" + d[2] + "</span>";
      cb.onchange = function () { done[i] = cb.checked; try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) {} draw(); if (cb.checked) ev("detox_plan"); };
      li.append(cb, lab); list.appendChild(li);
    });
    root.appendChild(list);
    root.appendChild(el("p", "tool-note", "Your ticks are saved in this browser only."));
    function draw() {
      var n = days.filter(function (_, i) { return done[i]; }).length;
      fill.style.width = (n / 7 * 100) + "%";
      lbl.textContent = n === 7 ? "All 7 days done. That is a real reset." : n + " of 7 days done";
    }
    draw();
  }

  var map = { "sugar-calc": sugarCalc, "drink-cubes": drinkCubes, "detox-plan": detoxPlan };
  document.querySelectorAll(".tool[data-tool]").forEach(function (root) {
    var f = map[root.getAttribute("data-tool")];
    if (f) f(root, root.getAttribute("data-lang") || document.documentElement.lang || "en");
  });
})();
