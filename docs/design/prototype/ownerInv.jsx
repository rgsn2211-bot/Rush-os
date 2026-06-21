/* Rush OS — Owner: Product Costing (list, detail recipe editor, add/edit). Inventory now lives in inventory.jsx / inventoryDetail.jsx. */
const { useState: useStateOI } = React;
const DOI = window.RushData;

/* ============ PRODUCT COSTING ============ */
function OwnerProducts({ mobile }) {
  const [view, setView] = useState("list");
  const [sel, setSel] = useState(null);
  if (view === "detail" && sel) return <ProductDetail product={sel} onBack={() => setView("list")} onEdit={() => setView("edit")} mobile={mobile} />;
  if (view === "add") return <ProductForm onBack={() => setView("list")} mobile={mobile} />;
  if (view === "edit" && sel) return <ProductForm product={sel} onBack={() => setView("detail")} mobile={mobile} />;

  const prods = DOI.products;
  return (
    <div>
      <PageHead title="Product Costing" sub={`${prods.length} products · each size/variant is its own product`} right={<Btn kind="primary" icon="plus" onClick={() => setView("add")}>Add Product</Btn>} />
      <Card pad={0}>
        <Table onRow={(r) => { setSel(r); setView("detail"); }}
          cols={[
            { h: "Product", cell: (r) => <span style={{ fontWeight: 600 }}>{r.name}</span> },
            { h: "Selling price", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono, fontWeight: 600 }}>{money(r.price)}</span> },
            { h: "Recipe cost", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono, color: RUSH.ink2 }}>{money(r.cost)}</span> },
            { h: "Gross margin", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono, fontWeight: 600, color: RUSH.green }}>{money(r.price - r.cost)}</span> },
            { h: "Margin %", align: "right", cell: (r) => { const p = ((r.price - r.cost) / r.price) * 100; return <Pill kind={p >= 70 ? "ok" : p >= 60 ? "expiring" : "low"}>{p.toFixed(0)}%</Pill>; } },
            { h: "", cell: () => <Icon name="chevron" size={16} color={RUSH.ink3} /> },
          ]}
          rows={prods} />
      </Card>
    </div>
  );
}
window.OwnerProducts = OwnerProducts;

function RecipeEditor({ recipe, setRecipe, mobile }) {
  const [adding, setAdding] = useState(false);
  const total = recipe.reduce((s, r) => s + r.cost, 0);
  const rm = (i) => setRecipe(recipe.filter((_, idx) => idx !== i));
  const addItem = (name) => { setRecipe([...recipe, { item: name, qty: 1, unit: "g", cost: 0.05 }]); setAdding(false); };
  return (
    <Card pad={0}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${RUSH.line2}` }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Recipe</div>
        <Btn kind="secondary" size="sm" icon="plus" onClick={() => setAdding(!adding)}>Add from inventory</Btn>
      </div>
      {adding && (
        <div style={{ padding: "12px 20px", background: RUSH.bg, borderBottom: `1px solid ${RUSH.line2}`, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {DOI.inventory.slice(0, 8).map((it) => (
            <button key={it.id} onClick={() => addItem(it.name)} style={{ padding: "7px 12px", borderRadius: 999, border: `1px solid ${RUSH.line}`, background: "#fff", fontSize: 13, fontWeight: 600, color: RUSH.navy, cursor: "pointer" }}>+ {it.name}</button>
          ))}
        </div>
      )}
      <Table
        cols={[
          { h: "Ingredient", cell: (r) => <span style={{ fontWeight: 600 }}>{r.item}</span> },
          { h: "Qty", align: "right", cell: (r) => <input defaultValue={r.qty} style={{ width: 56, padding: "6px 8px", fontFamily: RUSH.mono, fontSize: 13, textAlign: "right", border: `1px solid ${RUSH.line}`, borderRadius: 8, outline: "none" }} /> },
          { h: "Unit", cell: (r) => <span style={{ color: RUSH.ink3 }}>{r.unit}</span> },
          { h: "Cost", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono, fontWeight: 600 }}>{money(r.cost)}</span> },
          { h: "", align: "right", cell: (r, i) => <button onClick={() => rm(i)} style={{ background: "none", border: "none", cursor: "pointer", color: RUSH.ink3 }}><Icon name="x" size={16} /></button> },
        ]}
        rows={recipe} />
      <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 20px", borderTop: `2px solid ${RUSH.line}`, background: RUSH.bg }}>
        <span style={{ fontWeight: 700, fontSize: 14.5 }}>Total recipe cost</span>
        <span style={{ fontFamily: RUSH.mono, fontWeight: 700, fontSize: 16 }}>{money(total)} <span style={{ fontSize: 12, color: RUSH.ink3 }}>BHD</span></span>
      </div>
    </Card>
  );
}

function ProductDetail({ product, onBack, onEdit, mobile }) {
  const [recipe, setRecipe] = useState(product.recipe);
  const total = recipe.reduce((s, r) => s + r.cost, 0);
  const margin = product.price - total;
  const marginPct = (margin / product.price) * 100;
  return (
    <div>
      <BackLink onClick={onBack}>Back to products</BackLink>
      <PageHead title={product.name} sub="Recipe-based cost & margin" right={<Btn kind="secondary" icon="settings" onClick={onEdit}>Edit product</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        <Metric label="Selling price" value={money(product.price)} />
        <Metric label="Recipe cost" value={money(total)} accent={RUSH.ink2} />
        <Metric label="Gross margin" value={money(margin)} accent={RUSH.green} />
        <Metric label="Margin %" value={`${marginPct.toFixed(0)}%`} suffix="" accent={marginPct >= 70 ? RUSH.green : RUSH.amber} />
      </div>
      <RecipeEditor recipe={recipe} setRecipe={setRecipe} mobile={mobile} />
      <div style={{ marginTop: 14, fontSize: 12.5, color: RUSH.ink3, display: "flex", alignItems: "center", gap: 7 }}><Icon name="ai" size={15} color={RUSH.ink3} />Ingredient costs come from each item's confirmed inventory cost. Margin updates live as you edit.</div>
    </div>
  );
}

function ProductForm({ product, onBack, mobile }) {
  const isEdit = !!product;
  const [recipe, setRecipe] = useState(product?.recipe || []);
  const total = recipe.reduce((s, r) => s + r.cost, 0);
  const [price, setPrice] = useState(product?.price || 0);
  const margin = (price || 0) - total;
  const marginPct = price ? (margin / price) * 100 : 0;
  return (
    <div>
      <BackLink onClick={onBack}>{isEdit ? "Back to product" : "Back to products"}</BackLink>
      <PageHead title={isEdit ? `Edit ${product.name}` : "Add Product"} sub="Each size or hot/cold variant is a separate product" />
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1.5fr 1fr", gap: 20, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card pad={20}>
            <SectionTitle>Product details</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 14 }}>
              <Field label="Product name"><Input value={product?.name || ""} placeholder="e.g. Iced Matcha Latte (Large)" onChange={() => {}} /></Field>
              <Field label="Category"><Select value="Coffee" onChange={() => {}} options={["Coffee", "Tea", "Cold", "Bakery", "Other"]} /></Field>
              <Field label="Selling price" hint="BHD"><Input mono value={product ? String(product.price) : ""} placeholder="0.000" onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Status"><Select value="Active" onChange={() => {}} options={["Active", "Inactive"]} /></Field>
            </div>
          </Card>
          <RecipeEditor recipe={recipe} setRecipe={setRecipe} mobile={mobile} />
        </div>
        <Card pad={20} style={{ position: mobile ? "static" : "sticky", top: 84 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Live margin</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <MiniStat label="Recipe cost" value={money(total)} accent={RUSH.ink2} />
            <MiniStat label="Selling price" value={money(price || 0)} />
            <MiniStat label="Gross margin" value={money(margin)} accent={RUSH.green} />
            <MiniStat label="Margin %" value={`${marginPct.toFixed(0)}%`} suffix="" accent={marginPct >= 70 ? RUSH.green : RUSH.amber} />
          </div>
          <Btn kind="primary" full size="lg" icon="check" style={{ marginTop: 18 }} onClick={onBack}>{isEdit ? "Save Product" : "Create Product"}</Btn>
          <Btn kind="ghost" full style={{ marginTop: 8 }} onClick={onBack}>Cancel</Btn>
        </Card>
      </div>
    </div>
  );
}
