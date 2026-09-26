import { PageHeader } from '../components/ui';

const SECTIONS: [string, string][] = [
  [
    'What we collect',
    'Your username, email address and password (stored only as a secure hash); the playtest sessions you sign up for; feedback you send; and basic activity such as logins and game launches.',
  ],
  [
    'Why',
    'To run playtests: letting you in, launching games, sending the reminders and Discord details you ask for, and resetting your password. Your data is never sold or shared for marketing.',
  ],
  [
    'Feedback is public',
    'Feedback you send from inside a game becomes a GitHub issue in that game’s public repository, under your username. Your email is never included.',
  ],
  [
    'Shared with No Easy Way Up',
    'Gametronyx and No Easy Way Up use the same player account, so the same username and password work on both.',
  ],
  [
    'Email',
    'You get account emails (welcome, confirmation, password reset) and, if you sign up for a scheduled playtest, that session’s details. Reminder emails are optional and can be turned off.',
  ],
  ['Deleting your account', 'Ask Tyler and he’ll delete your account and the data tied to it.'],
];

export default function Privacy() {
  return (
    <div className="mx-auto max-w-prose">
      <PageHeader kicker="Plain-language" title="Privacy notice">
        Gametronyx is a small, invite-only playtest site run by Tyler Bielman.
      </PageHeader>
      <div className="space-y-6">
        {SECTIONS.map(([title, body]) => (
          <section key={title}>
            <h2 className="mb-2 font-display text-lg uppercase tracking-wide">{title}</h2>
            <p className="leading-relaxed text-fg-2">{body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
