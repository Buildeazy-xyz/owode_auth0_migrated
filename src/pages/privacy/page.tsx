import Header from "@/components/Header.tsx";
import Footer from "@/components/Footer.tsx";

const UPDATED = "4 September 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-14">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Owodeexpress {"\u2022"} Last updated {UPDATED}
        </p>

        <div className="mt-10 space-y-8 text-[15px] leading-7">
          <section>
            <h2 className="text-xl font-semibold mb-3">Who we are</h2>
            <p>
              Owodeexpress is operated by OWODE Digital Services Limited
              (RC 8569061), 30 Babatunde Ire Street, Ilo, Ota, Ogun State,
              Nigeria. This policy explains what we collect when you use the
              Owodeexpress app, why we collect it, and what we do with it.
            </p>
            <p className="mt-3">
              Owodeexpress is a record-keeping platform for thrift (ajo)
              contributions. It records what agents collect and what savers
              have contributed. It does not hold or transfer funds.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">What we collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Your name and phone number.</strong> Used to create your
                account, to sign you in, and so your agent knows who you are.
              </li>
              <li>
                <strong>Your address or area.</strong> Used only to assign you an
                agent who works near you. We do not collect your device location.
              </li>
              <li>
                <strong>Your occupation and email.</strong> Both optional. Email is
                used to send you receipts if you provide it.
              </li>
              <li>
                <strong>Your contribution records.</strong> Every payment your agent
                records on your behalf, with the date, amount and reference number.
              </li>
              <li>
                <strong>Bank details for payouts.</strong> Bank name, account number
                and account name, used only to pay a withdrawal you have requested.
              </li>
              <li>
                <strong>Messages and voice notes.</strong> Messages you exchange with
                your agent, including any voice notes you record.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Why we collect it</h2>
            <p>
              We collect this information to run the service: to keep an accurate
              record of your contributions, to assign you an agent, to process
              withdrawals you request, and to let you and your agent communicate.
            </p>
            <p className="mt-3">
              We do not sell your information. We do not share it with advertisers.
              We do not use it for any purpose other than running Owodeexpress.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Who can see your information</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Your assigned agent can see your contribution records and your messages with them.</li>
              <li>
                OWODE administrators can see all records and all conversations. This
                is deliberate: it allows us to investigate a dispute if you ever
                raise one.
              </li>
              <li>No other saver or agent can see your information.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">How we protect it</h2>
            <p>
              Your password and PIN are stored only as a one-way hash, so nobody at
              OWODE can read them. All information sent between the app and our
              servers is encrypted in transit. Withdrawals are reviewed before
              payment, and larger amounts require two administrators to approve.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Service providers</h2>
            <p>
              We use Convex to store data, Termii to send SMS, Resend to send email,
              and Expo to deliver notifications. These providers process information
              only on our instruction and only so the service can work.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">How long we keep it</h2>
            <p>
              We keep your contribution records for as long as your account is open,
              and for a period afterwards where we are required to for accounting or
              legal reasons. You can ask us to delete your account at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Your rights</h2>
            <p>
              You may ask to see the information we hold about you, ask us to
              correct anything wrong, or ask us to delete your account. You can
              request deletion at{" "}
              <a href="/delete-account" className="underline font-medium">
                owodealajo.com/delete-account
              </a>{" "}
              or by writing to us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Children</h2>
            <p>
              Owodeexpress is not intended for anyone under 18. We do not knowingly
              collect information from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Changes to this policy</h2>
            <p>
              If we change this policy we will update the date at the top of this
              page and, where the change is significant, tell you in the app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Contact us</h2>
            <p>
              Email{" "}
              <a href="mailto:info@owodealajo.com" className="underline font-medium">
                info@owodealajo.com
              </a>
              , or write to OWODE Digital Services Limited, 30 Babatunde Ire Street,
              Ilo, Ota, Ogun State, Nigeria.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
