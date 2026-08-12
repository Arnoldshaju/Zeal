import Image from "next/image";
import Link from "next/link";

const features = [
  {
    number: "01",
    title: "Rich-text editing",
    description:
      "Create expressive documents with headings, lists, formatting, and a focused writing experience.",
  },
  {
    number: "02",
    title: "Live collaboration",
    description:
      "Work with your team in real time and see document updates without refreshing the page.",
  },
  {
    number: "03",
    title: "Secure sharing",
    description:
      "Share documents with selected people while keeping your work private and controlled.",
  },
  {
    number: "04",
    title: "Flexible permissions",
    description:
      "Assign owner, editor, and viewer roles so everyone has the right level of access.",
  },
];

const steps = [
  {
    number: "1",
    title: "Create your account",
    description: "Register for Zeal and access your personal dashboard.",
  },
  {
    number: "2",
    title: "Start a document",
    description: "Create a document and begin writing with the rich-text editor.",
  },
  {
    number: "3",
    title: "Invite your team",
    description: "Share access and collaborate with others in real time.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0d0f13] text-white">
      <header className="relative z-20 border-b border-white/5">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <div className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
            <a
              href="#features"
              className="transition-colors hover:text-white"
            >
              Features
            </a>

            <a
              href="#how-it-works"
              className="transition-colors hover:text-white"
            >
              How it works
            </a>

            <a
              href="#about"
              className="transition-colors hover:text-white"
            >
              About
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-3 py-2 text-sm font-semibold text-zinc-300 transition hover:text-white sm:px-4"
            >
              Sign in
            </Link>

            <Link
              href="/register"
              className="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 sm:px-5"
            >
              Sign up
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-indigo-600/15 blur-[140px]"
        />

        <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-20 text-center sm:px-8 sm:pt-28 lg:px-12 lg:pt-32">
          <p className="mx-auto mb-6 w-fit rounded-full border border-indigo-400/20 bg-indigo-400/10 px-4 py-2 text-sm font-medium text-indigo-300">
            A better space for collaborative writing and editing
          </p>

          <h1 className="mx-auto max-w-5xl text-5xl font-bold tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
            Write together,
            <span className="block bg-gradient-to-r from-indigo-300 via-violet-400 to-indigo-500 bg-clip-text text-transparent">
              wherever you are.
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-zinc-400 sm:text-lg">
            Create, edit, and share documents in real time. Zeal gives your
            team one focused space to turn ideas into meaningful work.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="#features"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-7 py-3.5 font-semibold text-zinc-200 transition hover:border-white/20 hover:bg-white/10 sm:w-auto"
            >
              Explore features
            </a>
          </div>

          <div className="relative mt-16 rounded-2xl border border-white/10 bg-white/5 p-2 shadow-2xl shadow-black/40 sm:mt-20 sm:p-3">
            <div
              aria-hidden="true"
              className="absolute -inset-px -z-10 rounded-2xl bg-gradient-to-r from-indigo-500/30 via-transparent to-violet-500/30 blur-xl"
            />

            <Image
              src="/zeal-remote-collaboration-v3.png"
              alt="Four people collaborating remotely from separate locations"
              width={1536}
              height={1024}
              priority
              className="aspect-[3/2] w-full rounded-xl object-cover"
            />
          </div>
        </div>
      </section>

      <section
        id="features"
        className="border-y border-white/5 bg-[#111318] py-24"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-400">
              Features
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              Everything your team needs to write together.
            </h2>

            <p className="mt-5 leading-7 text-zinc-400">
              Zeal combines focused editing, secure access, and real-time
              collaboration in one clear workspace.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {features.map((feature) => (
              <article
                key={feature.number}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition hover:-translate-y-1 hover:border-indigo-400/30 hover:bg-white/[0.05]"
              >
                <span className="text-sm font-semibold text-indigo-400">
                  {feature.number}
                </span>

                <h3 className="mt-8 text-xl font-semibold">
                  {feature.title}
                </h3>

                <p className="mt-3 max-w-lg leading-7 text-zinc-400">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-400">
              How it works
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              Start collaborating in minutes.
            </h2>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <article
                key={step.number}
                className="relative rounded-2xl border border-white/10 bg-[#13151b] p-7"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500 font-bold">
                  {step.number}
                </span>

                <h3 className="mt-6 text-xl font-semibold">{step.title}</h3>

                <p className="mt-3 leading-7 text-zinc-400">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="pb-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="overflow-hidden rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/20 via-[#151722] to-violet-500/10 px-7 py-14 text-center sm:px-12 sm:py-20">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
              Built for ideas
            </p>

            <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">
              Your next great document starts here.
            </h2>

            <p className="mx-auto mt-5 max-w-xl leading-7 text-zinc-300">
              Bring your thoughts, teammates, and documents together in a
              workspace designed for focused collaboration.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="rounded-lg bg-white px-7 py-3.5 font-semibold text-[#0d0f13] transition hover:bg-zinc-200"
              >
                Create an account
              </Link>

              <Link
                href="/login"
                className="rounded-lg border border-white/15 bg-white/5 px-7 py-3.5 font-semibold text-white transition hover:bg-white/10"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-zinc-500 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <p>© 2026 Zeal. Collaborative writing, simplified.</p>

          <div className="flex gap-6">
            <a href="#features" className="transition hover:text-zinc-300">
              Features
            </a>

            <Link href="/login" className="transition hover:text-zinc-300">
              Sign in
            </Link>

            <Link href="/register" className="transition hover:text-zinc-300">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
