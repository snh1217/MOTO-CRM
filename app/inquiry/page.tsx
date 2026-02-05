import InquiryForm from '@/components/InquiryForm';
import Nav from '@/components/Nav';
import { strings } from '@/lib/strings.ko';

export default function InquiryPage() {
  return (
    <main className="space-y-6">
      <Nav />
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{strings.inquiry.title}</h2>
        <p className="mt-1 text-sm text-slate-500">문의 내용을 입력하면 관리자에게 전달됩니다.</p>
        <div className="mt-6">
          <InquiryForm />
        </div>
      </section>
    </main>
  );
}
