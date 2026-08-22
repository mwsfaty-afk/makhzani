"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type QuickField =
  | { type: "text" | "email" | "tel" | "number"; name: string; label: string; required?: boolean; defaultValue?: string }
  | { type: "select"; name: string; label: string; required?: boolean; defaultValue?: string; options: { value: string; label: string }[] }
  | { type: "checkbox"; name: string; label: string; defaultChecked?: boolean };

export function QuickFormDialog({
  triggerLabel,
  title,
  description,
  fields,
  action,
}: {
  triggerLabel: string;
  title: string;
  description?: string;
  fields: QuickField[];
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await action(formData);
      if (res.error) {
        setError(res.error);
        return;
      }
      toast.success("تم الحفظ بنجاح");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <form action={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            {fields.map((field) => (
              <div key={field.name} className="flex flex-col gap-1.5">
                {field.type === "checkbox" ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name={field.name}
                      defaultChecked={field.defaultChecked}
                      className="size-4 rounded border-input"
                    />
                    {field.label}
                  </label>
                ) : field.type === "select" ? (
                  <>
                    <Label htmlFor={field.name}>{field.label}</Label>
                    <Select name={field.name} defaultValue={field.defaultValue} items={field.options}>
                      <SelectTrigger id={field.name}>
                        <SelectValue placeholder="اختر..." />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <>
                    <Label htmlFor={field.name}>{field.label}</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type={field.type}
                      required={field.required}
                      defaultValue={field.defaultValue}
                    />
                  </>
                )}
              </div>
            ))}

            {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
