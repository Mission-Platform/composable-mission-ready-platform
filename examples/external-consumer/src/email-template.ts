import {
  EmailButton,
  EmailCard,
  EmailContainer,
  EmailDocument,
  EmailFooter,
  EmailHeader,
  EmailRow,
  EmailSection,
  EmailTypography,
  assertCompatibleEmailHtml,
} from "@mission-platform/email-components/email";
import { renderEmail } from "@mission-platform/email-renderer";

export const EMAIL_SUBJECT = "Mission Platform email showcase";

export interface EmailRequest {
  readonly to: string;
  readonly recipientName: string;
}

export function renderDemoEmail(request: EmailRequest): string {
  const node = EmailDocument({
    previewText:
      "A local preview of the Mission Platform email component system.",
    children: EmailContainer({
      children: [
        EmailHeader({ brandName: "Mission Platform" }),
        EmailSection({
          background: "bg.base",
          padding: "xl",
          children: [
            EmailTypography({
              as: "h1",
              children: `Welcome, ${request.recipientName.trim()}`,
            }),
            EmailTypography({
              children:
                "This message was rendered by the shared email components and delivered to MailPit.",
            }),
            EmailCard({
              background: "bg.surface",
              borderColor: "border.default",
              children: EmailTypography({
                variant: "body-sm",
                children:
                  "Preview the same HTML that the send operation submits to SMTP.",
              }),
            }),
            EmailRow({
              spacing: "sm",
              children: [
                EmailButton({
                  href: "https://missionplatform.io",
                  variant: "primary",
                  size: "lg",
                  children: "Open platform",
                }),
                EmailButton({
                  href: "https://missionplatform.io/docs",
                  variant: "secondary",
                  size: "lg",
                  children: "Read docs",
                }),
              ],
            }),
            EmailTypography({
              variant: "body-sm",
              children: [
                "Learn more in the ",
                EmailTypography({
                  href: "https://missionplatform.io/docs",
                  children: "Mission Platform documentation",
                }),
                ".",
              ],
            }),
          ],
        }),
        EmailFooter({ text: `Sent to ${request.to} by the local showcase.` }),
      ],
    }),
  });
  const html = renderEmail(node, { title: EMAIL_SUBJECT, responsive: true });
  assertCompatibleEmailHtml(html);
  return html;
}
