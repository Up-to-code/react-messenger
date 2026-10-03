import type { Dispatch, ReactNode } from "react";
export type Locale = "ar" | "en";
export type Delivery = "standard" | "express" | "pickup";
export type Extra = "case" | "charger" | "care";
export interface Product {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  colors: string[];
  type: string;
  collections: string[];
  image: string;
  variantKey: string;
  variants: string[];
  feature: string;
  featureAr: string;
}
export interface NamedOption {
  id: string;
  en: string;
  ar: string;
  hex?: string;
}
export interface Selection {
  productId: string;
  variant: string;
  color: string;
  colors?: string[];
  delivery: Delivery;
  extras: Extra[];
  stage?: number;
}
export interface Filters {
  minPrice: number;
  maxPrice: number | null;
  colors: string[];
  sizes: string[];
  types: string[];
  collections: string[];
}
export type FilterField =
  "price" | "colors" | "sizes" | "types" | "collections";
export interface Customer {
  name: string;
  phone: string;
  city: string;
  address: string;
  date: string;
  slot: "morning" | "afternoon" | "evening";
}
export interface Quote {
  quantity: number;
  subtotal: number;
  extras: number;
  delivery: number;
  total: number;
  currency: "USD";
}
export interface DemoPayment {
  method: "card" | "cod";
  status: "paid" | "pending";
  reference: string;
  createdAt: number;
}
export interface Order {
  id: string;
  sourceId: string;
  conversationId?: string;
  status: "draft" | "confirmed";
  createdAt: number;
  selection: Selection;
  customer: Customer;
  quote: Quote;
  payment?: DemoPayment;
}
export interface ChoiceOption {
  id: string;
  label: string;
}
export interface CardFields {
  productId?: string;
  productIds?: string[];
  groupId?: string;
  field?: FilterField;
  filters?: Filters;
  variant?: string;
  selection?: Selection;
  order?: Order;
  question?: string;
  multiple?: boolean;
  options?: ChoiceOption[];
  selected?: string[];
}
export type ProductCard = CardFields &
  (
    | { type: "products" | "comparison" | "product-list"; productIds: string[] }
    | { type: "options" | "product-detail" | "color"; productId: string }
    | { type: "variant"; productId: string; variant: string; groupId: string }
    | {
        type:
          | "selection"
          | "confirmed"
          | "delivery-choice"
          | "extras-choice"
          | "order-details";
        selection: Selection;
      }
    | { type: "order-summary"; order: Order }
    | { type: "filters"; filters: Filters }
    | {
        type: "criterion";
        groupId: string;
        field: FilterField;
        filters: Filters;
      }
    | { type: "filter-apply"; groupId: string; filters: Filters }
    | {
        type: "action-choice";
        question: string;
        multiple: boolean;
        options: ChoiceOption[];
        selected: string[];
      }
  );
export type CardOf<T extends ProductCard["type"]> = ProductCard & { type: T };
export type OrderDraft = Omit<Order, "quote"> & { quote?: Quote };
export interface OrderRequest {
  type: "order-request";
  messageId: string;
}
export interface Attachment {
  name: string;
  url: string;
  type?: string;
  size?: number;
}
export interface Reply {
  id: string;
  name: string;
  text: string;
}
export interface Poll {
  question: string;
  options: ChoiceOption[];
  vote: string | null;
}
export interface Reference {
  messageId: string;
  conversationId?: string;
}
export interface InteractionPayload {
  selection?: Selection;
  productId?: string;
  productIds?: string[];
  filters?: Partial<Filters>;
  order?: Order;
}
export interface Interaction {
  method: string;
  sourceId: string;
  payload: InteractionPayload;
}
export interface Message {
  id: string;
  author: "apple" | "orange" | "agent";
  message: string;
  timestamp: number;
  status?:
    | "sending"
    | "queued"
    | "sent"
    | "delivered"
    | "read"
    | "thinking"
    | "streaming"
    | "complete"
    | "failed"
    | "stopped";
  messageKey?: string;
  motion?: boolean;
  error?: boolean;
  promptId?: string;
  turnId?: string;
  attachment?: Attachment | null;
  poll?: Poll | null;
  productCard?: ProductCard | null;
  reply?: Reply | null;
  forwarded?: {
    conversationId: string;
    messageId: string;
    name: string;
  } | null;
  references?: string[];
  reaction?: string | null;
  interaction?: Interaction | null;
}
export interface Conversation {
  id: string;
  name: string;
  nameAr?: string;
  photo?: string;
  online?: boolean;
  typing?: boolean;
  timestamp?: number;
  unread?: number;
  kind?: "agent";
  messages: Message[];
}
export interface SendContent {
  text?: string;
  attachment?: Attachment | null;
  poll?: Poll | null;
  productCard?: ProductCard | null;
  reply?: Reply | null;
  forwarded?: Message["forwarded"];
  interaction?: Interaction | null;
}
export type Send = (content: SendContent) => boolean;
export type ChatAction =
  | { type: "restore"; conversations: Conversation[] }
  | { type: "create"; conversation: Conversation }
  | { type: "append"; conversationId: string; message: Message }
  | { type: "typing"; conversationId: string; value: boolean }
  | {
      type: "patch";
      conversationId: string;
      messageId: string;
      patch: Partial<Message>;
    }
  | { type: "delta"; conversationId: string; messageId: string; text: string }
  | { type: "react"; conversationId: string; messageId: string; emoji: string }
  | {
      type: "vote";
      conversationId: string;
      messageId: string;
      optionId: string;
    };
export type ChatDispatch = Dispatch<ChatAction>;
export interface AgentMessage {
  id?: string;
  role: "user" | "assistant";
  text: string;
  image?: string;
}
export interface AgentInput {
  locale: Locale;
  messages: AgentMessage[];
  threadId?: string;
  actionMessageIds?: string[];
}
export type AgentEvent =
  | { type: "mode"; mode: string }
  | { type: "delta"; text: string }
  | { type: "message_start" }
  | { type: "card"; card: ProductCard | OrderRequest }
  | { type: "poll"; poll: Poll }
  | { type: "reference"; messageId: string; text?: string }
  | { type: "done" }
  | { type: "error"; error?: string; code?: string };
export type Presentation =
  | { type: "card"; card: ProductCard | OrderRequest; text?: string }
  | { type: "poll"; poll: Poll }
  | { type: "reference"; messageId: string; text?: string }
  | { type: "messages"; messages: string[] };
export interface FunctionCall {
  type: string;
  name: string;
  arguments: string;
  call_id?: string;
}
export interface FunctionTool {
  type: "function";
  name: string;
  description: string;
  strict: boolean;
  parameters: Record<string, unknown>;
}
export interface ProviderOptions {
  backend?: string;
  mode?: string;
  apiKey?: string;
  model?: string;
  serviceURL?: string;
  serviceToken?: string;
  configurationError?: boolean;
  requestSignal?: AbortSignal;
  fetchImpl?: typeof fetch;
}
export interface ProviderRequest {
  apiKey?: string;
  model?: string;
  serviceURL?: string;
  serviceToken?: string;
  signal: AbortSignal;
  fetchImpl: typeof fetch;
}
export interface ArchivedMessage {
  sequence?: number;
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}
export interface Thread {
  id: string;
  title: string;
  updated_at: number;
  count: number;
}
export interface MemoryFact {
  id: string;
  text: string;
}
export interface ThreadSummary {
  count: number;
  facts: MemoryFact[];
  excerpts: MemoryFact[];
  method: "extractive";
}
export interface ThreadDetail {
  messages: ArchivedMessage[];
  summary: ThreadSummary;
}
export interface OwnerIdentity {
  owner: string;
  cookie: string | null;
}
export interface StoredChat {
  version: number;
  conversations: Conversation[];
}
export interface ProductAction extends InteractionPayload {
  method: string;
  sourceId?: string;
  direct?: boolean;
  variant?: string;
  field?: FilterField;
  value?: number | string[] | { minPrice: number; maxPrice: number | null };
  selected?: string[];
  customer?: Customer;
  selection?: Selection;
}
export type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;
export interface ProductActions {
  disabled?: boolean;
  appliedSelection?: Selection;
  variantOverride?: string;
  filterValues?: Filters;
  onActionChoice: (ids: string[]) => boolean | void;
  onVariant: (variant: string) => void;
  onChoose: (id: string, selection?: Selection, direct?: boolean) => void;
  onDeliveryChoice: (selection: Selection) => void;
  onExtrasChoice: (selection: Selection) => void;
  onOrder: (selection: Selection, customer: Customer) => boolean | void;
  onFilterChange: (filters: Filters) => boolean | void;
  onFilter: (filters: Filters) => void;
  onCompare: (ids: string[]) => void;
  onSelectProducts: (ids: string[]) => void;
  onDelivery: (selection: Selection) => void;
  onExtras: (selection: Selection) => void;
  onConfirm: (selection: Selection) => void;
  onCheckout: (selection: Selection) => void;
}
export interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}
export interface ProviderFrame {
  text?: string;
  type?: string;
  error?: unknown;
  delta?: string;
  item_id?: string;
  item?: FunctionCall;
  choices?: {
    finish_reason?: string;
    delta?: {
      content?: string;
      refusal?: string;
      tool_calls?: {
        index: number;
        function?: { name?: string; arguments?: string };
      }[];
    };
  }[];
}
