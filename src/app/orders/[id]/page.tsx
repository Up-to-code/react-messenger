import OrderPage from "../../../components/Products/OrderPage";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderPage id={id} />;
}
