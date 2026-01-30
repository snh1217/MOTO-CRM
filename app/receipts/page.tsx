import Nav from '@/components/Nav';
import ReceiptForm from '@/components/ReceiptForm';

export default function ReceiptsRegisterPage() {
  return (
    <main className="space-y-6">
      <Nav />
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">?? ??</h2>
        <p className="mt-1 text-sm text-slate-500">
          ?? ?? ??? ???? ???? ??? ? ????.
        </p>
        <div className="mt-6">
          <ReceiptForm />
        </div>
      </section>
    </main>
  );
}
