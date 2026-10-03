import ActionChoices from "./ActionChoices";
import { ProductDetail, VariantPart } from "./OptionParts";
import { OrderChoice, OrderDetails, OrderSummary } from "./OrderCards";
import ProductList from "./ProductList";
import FilterPart from "./FilterPart";
import ColorOptions from "./ColorOptions";
import ProductStrip from "./ProductStrip";
import ComparisonCard from "./ComparisonCard";
import SelectionCard from "./SelectionCard";
import "./Products.css";
export default function ProductCard({ card, ...actions }) {
  if (card.type === "action-choice")
    return <ActionChoices card={card} {...actions} />;
  if (card.type === "order-details")
    return <OrderDetails card={card} {...actions} />;
  if (card.type === "order-summary") return <OrderSummary order={card.order} />;
  if (["delivery-choice", "extras-choice"].includes(card.type))
    return <OrderChoice card={card} {...actions} />;
  if (["criterion", "filter-apply"].includes(card.type))
    return <FilterPart card={card} {...actions} />;
  if (card.type === "product-detail") return <ProductDetail card={card} />;
  if (card.type === "variant")
    return (
      <VariantPart
        card={card}
        onVariant={actions.onVariant}
        disabled={actions.disabled}
      />
    );
  if (card.type === "color" || card.type === "options")
    return (
      <ColorOptions
        productId={card.productId}
        selection={actions.appliedSelection || card.selection}
        mode={card.type === "color" ? "color" : "full"}
        variantOverride={actions.variantOverride}
        disabled={actions.disabled}
        onSelect={(selection) =>
          actions.onChoose(card.productId, selection, true)
        }
      />
    );
  if (card.type === "product-list")
    return <ProductList card={card} {...actions} />;
  if (card.type === "products")
    return <ProductStrip card={card} {...actions} />;
  if (card.type === "comparison")
    return <ComparisonCard card={card} {...actions} />;
  if (["selection", "confirmed"].includes(card.type))
    return <SelectionCard card={card} {...actions} />;
  return null;
}
