import { Link } from 'react-router-dom';

/** Public privacy policy (linked from Google's sign-in screen). */
export default function Privacy() {
  const h = 'mt-6 text-lg font-semibold';
  return (
    <div className="mx-auto max-w-2xl px-5 py-10 leading-relaxed">
      <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
        <img src="/favicon.svg" alt="" className="h-7 w-7" />
        <span>TNPSC <span className="text-brand">Master</span></span>
      </Link>
      <h1 className="mt-6 text-2xl font-bold tracking-tight">Privacy policy</h1>
      <p className="mt-1 text-sm text-muted">Last updated: 22 November 2026</p>

      <p className="mt-4">
        TNPSC Master is a free study app for TNPSC Group 1 aspirants, run by Xeyon AI. This page explains what we collect and why.
      </p>

      <h2 className={h}>What we collect</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li><b>Account details:</b> your name and email address. If you sign in with Google, Google shares only your name, email address and profile picture with us. We never see your Google password.</li>
        <li><b>Profile details you enter:</b> such as district, target exam year and study preferences.</li>
        <li><b>Study activity:</b> quiz answers and scores, reading progress and bookmarks.</li>
        <li><b>Discussion messages</b> you post in the app's chat rooms, which other members can read.</li>
      </ul>

      <h2 className={h}>How we use it</h2>
      <p className="mt-2">
        To run your account, track your progress, personalise practice, and moderate discussions. We do not sell your data or show advertising based on it.
      </p>

      <h2 className={h}>Where it is stored</h2>
      <p className="mt-2">
        Data is stored with our hosting providers (Supabase, Vercel and Railway). When you ask for an AI chapter summary, the chapter's textbook text, not your personal data, is sent to OpenAI to write the summary.
      </p>

      <h2 className={h}>Your choices</h2>
      <p className="mt-2">
        You can edit your profile at any time. To delete your account and data, email{' '}
        <a href="mailto:pradeepkumar089@gmail.com" className="text-brand underline">pradeepkumar089@gmail.com</a> and we will remove it within 30 days.
      </p>

      <h2 className={h}>Not an official app</h2>
      <p className="mt-2">
        TNPSC Master is an independent study aid. It is not affiliated with, or endorsed by, the Tamil Nadu Public Service Commission or the Government of Tamil Nadu.
        Study material is based on Tamil Nadu SCERT textbooks.
      </p>
    </div>
  );
}
