import Header from "@/components/Header.tsx";
import Footer from "@/components/Footer.tsx";

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-14">
        <h1 className="text-3xl font-bold tracking-tight">
          Delete your account
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Owodeexpress {"\u2022"} OWODE Digital Services Limited
        </p>

        <div className="mt-10 space-y-8 text-[15px] leading-7">
          <section>
            <h2 className="text-xl font-semibold mb-3">Before you ask</h2>
            <p>
              If you still have savings recorded with us, please request a
              withdrawal first. Once your account is deleted we can no longer show
              you your record, and settling any balance becomes slower.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">How to request deletion</h2>
            <p>Send us an email from the address on your account, or from any address if you did not give us one, including:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>The phone number you use to sign in</li>
              <li>Your full name as it appears in the app</li>
              <li>The words &ldquo;Delete my Owodeexpress account&rdquo;</li>
            </ul>
            <p className="mt-4">
              Send it to{" "}
              <a href="mailto:info@owodealajo.com" className="underline font-medium">
                info@owodealajo.com
              </a>
              . We will confirm your identity before acting on the request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">What gets deleted</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Your name, phone number, email, address and occupation</li>
              <li>Your password and PIN</li>
              <li>Your messages and voice notes</li>
              <li>Your bank details held for payouts</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">What we keep, and why</h2>
            <p>
              We keep a record of contributions collected and withdrawals paid, with
              your name removed where we can. We are required to keep these for
              accounting purposes and to settle any dispute that arises later. These
              records are kept for seven years and are not used for anything else.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">How long it takes</h2>
            <p>
              We action deletion requests within 30 days of confirming your
              identity. You will receive a confirmation once it is done.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Questions</h2>
            <p>
              Email{" "}
              <a href="mailto:info@owodealajo.com" className="underline font-medium">
                info@owodealajo.com
              </a>{" "}
              and we will help.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
