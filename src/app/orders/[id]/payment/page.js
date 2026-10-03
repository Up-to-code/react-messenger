import PaymentPage from "../../../../components/Products/PaymentPage";
export default async function Payment({ params }) {
  const { id } = await params;
  return <PaymentPage id={id} />;
}
