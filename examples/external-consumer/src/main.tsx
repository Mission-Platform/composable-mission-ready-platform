import '@mission-platform/tokens/scss/tokens';
import {ForgeBadge, ForgeButton, ForgeCard, ForgeStack, ForgeTypography,} from "@mission-platform/components";
import {ForgeSchemaForm, type FormValues, type SchemaFormDefinition,} from "@mission-platform/forms";
import {useRef, useState} from "react";
import {createRoot} from "react-dom/client";

import {renderDemoEmail} from "./email-template.js";

type Operation = "preview" | "send";
type Status = { kind: "idle" | "success" | "error"; message: string };

const MAILPIT_UI_URL =
  import.meta.env.VITE_MAILPIT_UI_URL ?? "http://localhost:8025";

const recipientSchema: SchemaFormDefinition = {
  type: "object",
  properties: {
    recipientName: {type: "string", title: "Recipient name", minLength: 1},
    recipientEmail: {
      type: "string",
      title: "Recipient email",
      format: "email",
    },
  },
  required: ["recipientName", "recipientEmail"],
};

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
    ) {
      return payload.error;
    }
  } catch {
    // Fall through to the status-based message when the Worker is unavailable.
  }
  return `The email Worker returned ${response.status}.`;
}

function App() {
  const [formValues, setFormValues] = useState<FormValues>({
    recipientEmail: "ada@example.com",
    recipientName: "Ada",
  });
  const [previewHtml, setPreviewHtml] = useState("");
  const [activeOperation, setActiveOperation] = useState<Operation | null>(
    null,
  );
  const [status, setStatus] = useState<Status>({kind: "idle", message: ""});
  const requestNumber = useRef(0);

  const requestEmail = async (
    operation: Operation,
    values: FormValues = formValues,
  ): Promise<void> => {
    const recipientEmail =
      typeof values.recipientEmail === "string" ? values.recipientEmail : "";
    const recipientName =
      typeof values.recipientName === "string" ? values.recipientName : "";
    const currentRequest = requestNumber.current + 1;
    requestNumber.current = currentRequest;
    setActiveOperation(operation);
    setStatus({kind: "idle", message: ""});

    try {
      const html = renderDemoEmail({recipientName, to: recipientEmail});
      if (currentRequest !== requestNumber.current) return;
      setPreviewHtml(html);

      if (operation === "preview") {
        setStatus({
          kind: "success",
          message: "Preview updated from the example-rendered email.",
        });
        return;
      }

      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({html, recipientName, to: recipientEmail}),
      });
      if (currentRequest !== requestNumber.current) return;
      if (!response.ok) throw new Error(await getErrorMessage(response));

      const payload: unknown = await response.json();
      const message =
        typeof payload === "object" &&
        payload !== null &&
        "message" in payload &&
        typeof payload.message === "string"
          ? payload.message
          : "Email delivered to MailPit.";
      setStatus({kind: "success", message});
    } catch (error) {
      if (currentRequest === requestNumber.current) {
        setStatus({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "The email request failed.",
        });
      }
    } finally {
      if (currentRequest === requestNumber.current) setActiveOperation(null);
    }
  };

  const handleSchemaSubmit = (values: FormValues, isValid: boolean): void => {
    if (isValid) void requestEmail("preview", values);
  };

  return (
    <main
      style={{
        background: "#f4f3f4",
        minHeight: "100vh",
        padding: "48px 24px",
      }}
    >
      <ForgeStack
        align="stretch" gap="xl" style={{margin: "0 auto", maxWidth: "1120px"}}
      > <ForgeStack gap="sm"> <ForgeBadge variant="info">Local showcase</ForgeBadge> <ForgeTypography
        as="h1"
        color="primary"
        variant="h1"
      > Mission Platform email showcase </ForgeTypography> <ForgeTypography variant="body-lg"> Render a
        production-shaped email in this example, preview the exact HTML, and deliver it to your local MailPit
        inbox. </ForgeTypography> </ForgeStack>

        <ForgeCard bordered padding="lg" shadow variant="neutral"> <ForgeStack gap="md"> <ForgeTypography
          as="h2"
          variant="h3"
        > Recipient </ForgeTypography> <ForgeSchemaForm
          modelValue={formValues}
          onSubmit={handleSchemaSubmit}
          onUpdateModelValue={setFormValues}
          schema={recipientSchema}
        /> <ForgeStack direction="horizontal" gap="sm" wrap> <ForgeButton
          disabled={activeOperation !== null}
          loading={activeOperation === "send"}
          onClick={() => void requestEmail("send")}
          size="lg"
          type="button"
          variant="secondary"
        > Send to MailPit </ForgeButton> </ForgeStack> </ForgeStack> </ForgeCard>

        {status.message ? (
          <ForgeTypography
            aria-live="polite"
            color={status.kind === "error" ? "error" : "success"}
            role={status.kind === "error" ? "alert" : "status"}
            variant="body-md"
          >
            {status.message}
          </ForgeTypography>
        ) : undefined}

        <ForgeCard bordered padding="none" variant="neutral"> <ForgeStack
          style={{
            background: "#211f22",
            padding: "16px 20px"
          }}
        > <ForgeTypography color="inverse" variant="label"> Rendered email preview </ForgeTypography>
        </ForgeStack> {previewHtml ? (
          <iframe
            aria-label="Rendered email preview" sandbox="" srcDoc={previewHtml} style={{
            background: "#ffffff",
            border: 0,
            display: "block",
            height: "720px",
            width: "100%",
          }} title="Rendered email preview"
          />
        ) : (
          <ForgeStack style={{padding: "48px 24px"}}> <ForgeTypography
            color="secondary" horizontalAlign="center" variant="body-md"
          > Submit the form to render the email in this example. </ForgeTypography> </ForgeStack>
        )}
        </ForgeCard>

        <ForgeTypography variant="body-sm"> Inspect delivered messages in{" "} <a
          href={MAILPIT_UI_URL}
          rel="noreferrer"
          target="_blank"
        > MailPit at {MAILPIT_UI_URL}
        </a> . </ForgeTypography> </ForgeStack>
    </main>
  );
}

const container = document.getElementById("app");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
