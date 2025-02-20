import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="w-full p-4 bg-muted/80 text-xs text-muted-foreground border-t">
      <div className="max-w-screen-xl mx-auto flex justify-between items-center">
        <div>
          © {new Date().getFullYear()} Chat Interface. All rights reserved.
        </div>
        <Link href="/terms" className="hover:text-foreground transition-colors">
          Terms & Conditions
        </Link>
      </div>
    </footer>
  );
}