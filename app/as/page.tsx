import AsReceiptForm from '@/components/AsReceiptForm';
import Nav from '@/components/Nav';
import { strings } from '@/lib/strings.ko';

export default function AsReceiptPage() {
  return (
    <main className="space-y-6">
      <Nav />
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{strings.as.title}</h2>
        <p className="mt-1 text-sm text-slate-500">{strings.as.description}</p>
        <div className="mt-6">
          <AsReceiptForm />
        </div>
      </section>
    </main>
  );
}
