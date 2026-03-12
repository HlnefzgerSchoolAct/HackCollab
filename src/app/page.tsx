import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="mx-auto flex max-w-3xl flex-col items-center px-4 pb-16 pt-24 text-center">
          <h1 className="text-3xl font-bold leading-title tracking-tight text-foreground md:text-4xl">
            Find collaborators.
            <br />
            <span className="bg-gradient-to-br from-hc-orange to-hc-red bg-clip-text text-transparent">
              Build together.
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-secondary leading-subheading">
            HackCollab helps Hack Club members discover projects, form teams,
            and ship real things — together.
          </p>
          <div className="mt-8 flex gap-4">
            <Button asChild variant="cta" size="lg">
              <Link href="/projects">Browse Projects</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Get Started</Link>
            </Button>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-sheet py-16">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="mb-8 text-center text-xl font-bold text-foreground">
              How it works
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Post a project",
                  desc: "Describe what you're building, define roles, and set a first milestone.",
                },
                {
                  step: "2",
                  title: "Find your team",
                  desc: "Builders apply to roles that match their skills. Review and accept.",
                },
                {
                  step: "3",
                  title: "Ship it",
                  desc: "Collaborate, hit milestones, and add a completed project to your record.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-lg bg-elevated p-6 shadow-md"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <h3 className="mb-1 font-bold text-foreground">{item.title}</h3>
                  <p className="text-sm text-secondary">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
