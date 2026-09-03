import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md px-4">
        <h1 className="text-4xl font-semibold tracking-tight">NUMU</h1>
        <p className="text-neutral-400 text-sm leading-relaxed">
          AI Production Studio. Create high-quality brand images and videos
          through one intelligent conversation.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/signup">
            <Button className="bg-accent-lime text-black hover:bg-accent-lime/90 font-medium">
              Get Started
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" className="border-neutral-700">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
