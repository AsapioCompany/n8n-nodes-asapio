# @asapio/n8n-nodes-asapio

An [n8n](https://n8n.io) community node to receive events dispatched by the **ASAPIO Integration Add-on** (Event Studio) from your SAP® software, via its n8n output channel.

This package provides the **ASAPIO Event Trigger** node, a webhook trigger that verifies the HMAC-SHA256 signature ASAPIO attaches to every dispatched event and starts your workflow with the verified payload.

## Prerequisites

- A source system running **SAP S/4HANA** or **SAP ECC**
- The **latest version of the ASAPIO Integration Add-on** installed on that system, with the **HMAC REST connector** configured for the n8n target endpoint

## Installation

Follow the n8n [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/), using `@asapio/n8n-nodes-asapio` as the package name.

```bash
npm install @asapio/n8n-nodes-asapio
```

## Credentials

The **ASAPIO API** credential holds the **Signing Secret** configured for the corresponding n8n target in Event Studio. This is the shared secret ASAPIO uses to compute the `X-ASAPIO-Signature` header on the sender side.

> **Note on "Test" button:** This node is a passive webhook receiver — ASAPIO calls n8n, not the other way around, so there is no ASAPIO API this credential could authenticate against. Clicking **Test** in the credential dialog only checks that `asapio.com` is reachable from your n8n instance; it does **not** validate the Signing Secret itself (which never leaves your environment). The Signing Secret is verified for real on every incoming event, inside the node's `webhook()` handler, against the raw request body.

## Node: ASAPIO Event Trigger

| Parameter | Description |
|---|---|
| Path | The last segment of the webhook URL n8n generates for this node. You choose this value freely (e.g. `asapio-events`) — n8n then shows you the full Test/Production URL, which you paste into the n8n target configuration in Event Studio so ASAPIO knows where to send events. |
| Timestamp Tolerance (Seconds) | Maximum allowed age of the `X-ASAPIO-Timestamp` header before an event is considered stale (replay protection). Default: `300`. |
| Reject Invalid Signatures | When enabled, requests with a missing, invalid, or stale signature are rejected with HTTP 401 and never trigger the workflow. When disabled (default), the workflow always triggers and the verification result is attached to the output under `asapio.signatureValid` / `asapio.timestampValid`, so your workflow logic can decide how to handle it. |

### How verification works

1. ASAPIO computes `HMAC-SHA256(secret, raw_payload_body)` and sends it as `X-ASAPIO-Signature: sha256=<hex>`, alongside `X-ASAPIO-Timestamp: <unix_ts>`.
2. This node recomputes the HMAC over the raw request body using the configured Signing Secret and compares it to the received signature using a constant-time comparison.
3. The timestamp is checked against the configured tolerance window to guard against replay attacks.

## Example Workflow

1. Add an **ASAPIO Event Trigger** node, set **Path** to `asapio-events`, and select your **ASAPIO API** credential.
2. Configure the corresponding n8n target in Event Studio with the webhook URL n8n shows for this node and the matching Signing Secret.
3. Add an **IF** node checking `{{$json.asapio.signatureValid}}` to branch on valid vs. invalid events (if **Reject Invalid Signatures** is left off).

## Compatibility

Tested against n8n's programmatic node API (`n8nNodesApiVersion: 1`).

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [n8n webhook trigger node documentation](https://docs.n8n.io/integrations/creating-nodes/build/reference/webhook-nodes/)
- [ASAPIO documentation](https://asapio.com/docs)

## License

[MIT](LICENSE)

The MIT license applies to the source code in this repository. It does not grant rights to the "ASAPIO" name or logo, which remain trademarks of ASAPIO GmbH.

## 3rd Party Trademarks

SAP and other SAP products and services mentioned herein as well as their respective logos are trademarks or registered trademarks of SAP SE in Germany and other countries.
