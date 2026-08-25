"use client";

import { useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarcodeScannerButton } from "@/components/barcode-scanner-button";
import { createItem } from "./actions";

type Option = { id: number; label: string };

export function ItemForm({
  categories,
  brands,
  units,
}: {
  categories: Option[];
  brands: Option[];
  units: Option[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createItem(formData);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">البيانات الأساسية</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field name="code" label="كود الصنف" required />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="barcode">الباركود (اختياري)</Label>
            <div className="flex gap-2">
              <Input id="barcode" name="barcode" ref={barcodeRef} className="flex-1" placeholder="أدخل يدويًا أو امسح بالكاميرا" />
              <BarcodeScannerButton
                onScan={(code) => {
                  if (barcodeRef.current) barcodeRef.current.value = code;
                }}
              />
            </div>
          </div>
          <Field name="nameAr" label="الاسم بالعربية" required />
          <Field name="name" label="الاسم بالإنجليزية" required />
          <SelectField name="categoryId" label="المجموعة" options={categories} />
          <SelectField name="brandId" label="العلامة التجارية" options={brands} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الوحدات والتحويل</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectField name="baseUnitId" label="الوحدة الأساسية" options={units} required />
          <SelectField name="purchaseUnitId" label="وحدة الشراء (اختياري)" options={units} />
          <Field name="purchaseUnitFactor" label="معامل تحويل الشراء" type="number" step="0.000001" defaultValue="1" />
          <SelectField name="salesUnitId" label="وحدة البيع (اختياري)" options={units} />
          <Field name="salesUnitFactor" label="معامل تحويل البيع" type="number" step="0.000001" defaultValue="1" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">التسعير والضريبة</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field name="purchasePrice" label="سعر الشراء" type="number" step="0.0001" />
          <Field name="salePrice" label="سعر البيع" type="number" step="0.0001" />
          <Field name="taxRate" label="نسبة الضريبة %" type="number" step="0.01" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">حدود المخزون</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field name="minStock" label="الحد الأدنى" type="number" step="0.0001" />
          <Field name="maxStock" label="الحد الأقصى" type="number" step="0.0001" />
          <Field name="reorderPoint" label="حد إعادة الطلب" type="number" step="0.0001" />
        </CardContent>
      </Card>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "جارٍ الحفظ..." : "حفظ الصنف"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  defaultValue,
  step,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  step?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} defaultValue={defaultValue} step={step} />
    </div>
  );
}

function SelectField({
  name,
  label,
  options,
  required,
}: {
  name: string;
  label: string;
  options: Option[];
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Select name={name} required={required}>
        <SelectTrigger id={name}>
          <SelectValue placeholder="اختر..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.id} value={String(opt.id)}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
