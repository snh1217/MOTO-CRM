import Nav from '@/components/Nav';
import ReceiptForm from '@/components/ReceiptForm';

export default function HomePage() {
  return (
    <main className="space-y-6">
      <Nav />
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">접수 등록</h2>
        <p className="mt-1 text-sm text-slate-500">
          정비 접수 정보를 입력하면 관리자가 확인할 수 있습니다.
        </p>
        <div className="mt-6">
          <ReceiptForm />
        </div>
      </section>
    </main>
  );
}
