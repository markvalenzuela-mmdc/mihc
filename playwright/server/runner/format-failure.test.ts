import assert from "node:assert/strict";
import { test } from "node:test";
import { describeCheck, formatE2eCheckError, formatFailure, type PwAnnotation } from "./format-failure";

/** Build a `check` annotation as `lib/checks.ts` `assertCheck` serializes it. */
function check(name: string, status: "pass" | "fail", message?: string): PwAnnotation {
  return { type: "check", description: JSON.stringify({ name, status, ...(message ? { message } : {}) }) };
}

function url(u: string): PwAnnotation {
  return { type: "url", description: u };
}

test("failed checks => bulleted human message with url, no internals", () => {
  const msg = formatFailure({
    status: "failed",
    annotations: [
      url("https://mmdc.mcl.edu.ph/certifications/meta-front-end-developer"),
      check("page-loads", "pass"),
      check("key-content", "fail", 'selector "main" visible=true textLen=0'),
      check("cta:Enroll Now", "fail", "visible=false enabled=false href=null"),
    ],
  });

  assert.equal(
    msg,
    [
      "2 checks failed on https://mmdc.mcl.edu.ph/certifications/meta-front-end-developer:",
      "• Expected page content did not render",
      '• The "Enroll Now" call-to-action was missing, hidden, disabled, or pointed to the wrong link',
    ].join("\n"),
  );

  // The low-level assertion internals must not leak into the message.
  for (const needle of ["toBeTruthy", "visible=", "textLen", "href=null"]) {
    assert.equal(msg?.includes(needle), false, `should not contain "${needle}"`);
  }
});

test("single failed check uses singular wording", () => {
  const msg = formatFailure({
    status: "failed",
    annotations: [url("https://example.com/x"), check("page-loads", "fail")],
  });
  assert.equal(
    msg,
    "1 check failed on https://example.com/x:\n• Page did not return a successful response",
  );
});

test("failed check without a url annotation omits the ' on <url>' clause", () => {
  const msg = formatFailure({ status: "failed", annotations: [check("key-content", "fail")] });
  assert.equal(msg, "1 check failed:\n• Expected page content did not render");
});

test("timeout with no check annotations => generic timeout line with url", () => {
  const msg = formatFailure({ status: "timedOut", annotations: [url("https://example.com/slow")] });
  assert.equal(msg, "Test timed out before completing its checks on https://example.com/slow");
});

test("failure with no check annotations => generic failure line", () => {
  const msg = formatFailure({ status: "failed", annotations: [], rawMessage: "Error: boom\n  at x" });
  assert.equal(msg, "Test failed before any checks completed");
  assert.equal(msg?.includes("boom"), false);
});

test("passed / skipped => null", () => {
  assert.equal(formatFailure({ status: "passed", annotations: [] }), null);
  assert.equal(formatFailure({ status: "skipped", annotations: [] }), null);
});

test("malformed check annotations are ignored", () => {
  const msg = formatFailure({
    status: "failed",
    annotations: [{ type: "check", description: "{not json" }, check("key-content", "fail")],
  });
  assert.equal(msg, "1 check failed:\n• Expected page content did not render");
});

test("describeCheck maps each known name and passes unknown through", () => {
  assert.equal(describeCheck("page-loads"), "Page did not return a successful response");
  assert.equal(describeCheck("key-content"), "Expected page content did not render");
  assert.equal(
    describeCheck("cta:Apply Now"),
    'The "Apply Now" call-to-action was missing, hidden, disabled, or pointed to the wrong link',
  );
  assert.equal(
    describeCheck("cta:Apply Now:navigates"),
    'The "Apply Now" call-to-action did not navigate to its expected destination',
  );
  assert.equal(describeCheck("some-future-check"), "some-future-check");
});

test("describeCheck maps E2E step filled names", () => {
  assert.equal(
    describeCheck("step-1 (Student Info): filled"),
    'Step 1 "Student Info" could not be filled',
  );
  assert.equal(
    describeCheck("step-3 (Payment Details): filled"),
    'Step 3 "Payment Details" could not be filled',
  );
});

test("describeCheck maps E2E step advanced names", () => {
  assert.equal(
    describeCheck("step-2 (Education): advanced"),
    'Step 2 "Education" did not advance',
  );
});

test("describeCheck maps submit and submission-confirmed", () => {
  assert.equal(describeCheck("submit"), "Form submission failed");
  assert.equal(describeCheck("submission-confirmed"), "Submission confirmation not received");
});

test("formatE2eCheckError returns described name + message", () => {
  assert.equal(
    formatE2eCheckError("step-1 (Student Info): filled", 'field "email": not found'),
    'Step 1 "Student Info" could not be filled — field "email": not found',
  );
});

test("formatE2eCheckError strips Error: prefix from caught errors", () => {
  assert.equal(
    formatE2eCheckError("step-1 (Student's Information): advanced", "Error: a required field is missing or invalid"),
    'Step 1 "Student\'s Information" did not advance — a required field is missing or invalid',
  );
});

test("formatE2eCheckError returns described name only when no message", () => {
  assert.equal(
    formatE2eCheckError("submit"),
    "Form submission failed",
  );
});
