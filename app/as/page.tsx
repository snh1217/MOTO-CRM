import Nav from '@/components/Nav';
import AsReceiptForm from '@/components/AsReceiptForm';

export default function AsPage() {
  return (
    <main className="space-y-6">
      <Nav />
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">A/S 접수</h2>
        <p className="mt-1 text-sm text-slate-500">
          A/S 접수 내용을 입력하면 관리자에게 즉시 전달됩니다.
        </p>
        <div className="mt-6">
          <AsReceiptForm />
        </div>
      </section>
    </main>
  );
}
