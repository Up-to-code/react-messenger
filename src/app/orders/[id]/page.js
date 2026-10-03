import OrderPage from "../../../components/Products/OrderPage";
export default async function Page({ params }) {
  const { id } = await params;
  return <OrderPage id={id} />;
}
