import Nav from '@/components/Nav';
import InquiryForm from '@/components/InquiryForm';

export default function InquiryPage() {
  return (
    <main className="space-y-6">
      <Nav />
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">문의 등록</h2>
        <p className="mt-1 text-sm text-slate-500">
          고객 문의 내용을 남겨주시면 빠르게 연락드리겠습니다.
        </p>
        <div className="mt-6">
          <InquiryForm />
        </div>
      </section>
    </main>
  );
}
