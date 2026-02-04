import ReceiptForm from '@/components/ReceiptForm';
import Nav from '@/components/Nav';
import { strings } from '@/lib/strings.ko';

export default function ReceiptPage() {
  return (
    <main className="space-y-6">
      <Nav />
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{strings.receipts.title}</h2>
        <p className="mt-1 text-sm text-slate-500">{strings.receipts.description}</p>
        <div className="mt-6">
          <ReceiptForm />
        </div>
      </section>
    </main>
  );
}
