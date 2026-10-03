import PaymentPage from "../../../../components/Products/PaymentPage";
export default async function Payment({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PaymentPage id={id} />;
}
