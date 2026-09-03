import { useState } from "react";
import { cx, money } from "../lib/format";
import { Ic } from "./icons";
import { Btn, Modal, Input, Field } from "./ui";
import { useApp } from "../store";

export function PaymentModal({ open, onClose, plan, price, onComplete }: { open: boolean; onClose: () => void; plan: string; price: number; onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [working, setWorking] = useState(false);

  const submit = () => {
    setWorking(true);
    setTimeout(() => {
      setWorking(false);
      onComplete();
    }, 1500);
  };

  return (
    <Modal open={open} onClose={onClose} title={<span className="flex items-center gap-2"><Ic name="lock" size={16} className="text-brand" /> Secure Checkout</span>} w={480}
      footer={
        <div className="flex w-full items-center justify-between">
          <p className="text-[11px] font-semibold text-mute"><Ic name="shield" size={12} className="inline mr-1" /> SSL Encrypted</p>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={onClose} disabled={working}>Cancel</Btn>
            <Btn variant="solid" onClick={submit} disabled={working}>
              {working ? "Processing..." : `Pay ${money(price)}`}
            </Btn>
          </div>
        </div>
      }>
      
      <div className="mb-4 overflow-hidden rounded-lg border border-line bg-card">
        <div className="bg-paper px-4 py-3 border-b border-line">
          <p className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-mute">Order Summary</p>
          <div className="mt-1 flex items-center justify-between">
            <p className="font-display text-[15px] font-bold text-ink">{plan} Plan</p>
            <p className="font-mono text-[14px] font-bold text-ink">{money(price)} <span className="text-[11px] font-semibold text-mute">/mo</span></p>
          </div>
        </div>
        <div className="px-4 py-3 space-y-3">
          <Field label="Name on card">
            <Input placeholder="Jane Doe" />
          </Field>
          <Field label="Card number">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mute"><Ic name="creditCard" size={15} /></span>
              <input type="text" placeholder="0000 0000 0000 0000" className="h-[38px] w-full rounded-md border border-line2 bg-card px-3 pl-9 text-[13px] outline-none transition-colors focus:border-brand" />
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Expiry date">
              <Input placeholder="MM/YY" />
            </Field>
            <Field label="CVC">
              <div className="relative">
                <input type="text" placeholder="123" className="h-[38px] w-full rounded-md border border-line2 bg-card px-3 pr-9 text-[13px] outline-none transition-colors focus:border-brand" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-mute"><Ic name="help" size={15} /></span>
              </div>
            </Field>
          </div>
        </div>
      </div>
    </Modal>
  );
}
