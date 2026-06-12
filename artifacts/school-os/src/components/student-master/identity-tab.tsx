import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculateAgeFromDob, STUDENT_STATUS_OPTIONS } from "@/lib/student-master-api";

export type IdentityFormState = {
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  bloodGroup: string;
  registrationNumber: string;
  admissionNumber: string;
  rollNumber: string;
  socialCategory: string;
  religion: string;
  nationality: string;
  aadhaar: string;
  penNumber: string;
  apaarId: string;
  udiseStudentId: string;
  isRteStudent: boolean;
  isCwsnStudent: boolean;
  classId: string;
  sectionId: string;
  house: string;
  admissionDate: string;
  status: string;
  photoUrl: string;
  signatureUrl: string;
  address: string;
  fatherName: string;
  motherName: string;
  parentPhone: string;
  parentEmail: string;
};

type Props = {
  form: IdentityFormState;
  onChange: (key: keyof IdentityFormState, value: string | boolean) => void;
  classes: Array<{ id: number; name: string; section?: string | null }>;
  sections?: Array<{ id: number; name: string; classId: number }>;
  isEdit: boolean;
};

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function StudentIdentityTab({ form, onChange, classes, sections, isEdit }: Props) {
  const age = calculateAgeFromDob(form.dateOfBirth);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identity Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Registration Number">
            <Input
              value={form.registrationNumber}
              onChange={(e) => onChange("registrationNumber", e.target.value)}
              placeholder="Auto-generated if empty"
            />
          </Field>
          <Field label="Admission Number">
            <Input
              value={form.admissionNumber}
              onChange={(e) => onChange("admissionNumber", e.target.value)}
              placeholder="Auto-generated if empty"
              disabled={isEdit}
            />
          </Field>
          <Field label="First Name">
            <Input required value={form.firstName} onChange={(e) => onChange("firstName", e.target.value)} />
          </Field>
          <Field label="Middle Name">
            <Input value={form.middleName} onChange={(e) => onChange("middleName", e.target.value)} />
          </Field>
          <Field label="Last Name">
            <Input required value={form.lastName} onChange={(e) => onChange("lastName", e.target.value)} />
          </Field>
          <Field label="Date of Birth">
            <Input
              type="date"
              required
              value={form.dateOfBirth}
              onChange={(e) => onChange("dateOfBirth", e.target.value)}
            />
          </Field>
          <Field label="Age">
            <Input value={age != null ? String(age) : ""} disabled placeholder="Calculated from DOB" />
          </Field>
          <Field label="Gender">
            <Select value={form.gender} onValueChange={(v) => onChange("gender", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Blood Group">
            <Input value={form.bloodGroup} onChange={(e) => onChange("bloodGroup", e.target.value)} />
          </Field>
          <Field label="Category">
            <Select value={form.socialCategory} onValueChange={(v) => onChange("socialCategory", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["general", "sc", "st", "obc", "other"].map((v) => (
                  <SelectItem key={v} value={v}>{v.toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Religion">
            <Input value={form.religion} onChange={(e) => onChange("religion", e.target.value)} />
          </Field>
          <Field label="Nationality">
            <Input value={form.nationality} onChange={(e) => onChange("nationality", e.target.value)} />
          </Field>
          <Field label="Aadhaar Number">
            <Input value={form.aadhaar} onChange={(e) => onChange("aadhaar", e.target.value)} />
          </Field>
          <Field label="PEN Number">
            <Input value={form.penNumber} onChange={(e) => onChange("penNumber", e.target.value)} />
          </Field>
          <Field label="APAAR ID">
            <Input value={form.apaarId} onChange={(e) => onChange("apaarId", e.target.value)} />
          </Field>
          <Field label="UDISE Student ID">
            <Input value={form.udiseStudentId} onChange={(e) => onChange("udiseStudentId", e.target.value)} />
          </Field>
          <Field label="RTE Student">
            <Select
              value={form.isRteStudent ? "yes" : "no"}
              onValueChange={(v) => onChange("isRteStudent", v === "yes")}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="CWSN / Special Need">
            <Select
              value={form.isCwsnStudent ? "yes" : "no"}
              onValueChange={(v) => onChange("isCwsnStudent", v === "yes")}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Admission Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Admission Date">
            <Input type="date" value={form.admissionDate} onChange={(e) => onChange("admissionDate", e.target.value)} />
          </Field>
          <Field label="Current Class">
            <Select required value={form.classId} onValueChange={(v) => onChange("classId", v)}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {sections && sections.length > 0 && (
            <Field label="Current Section">
              <Select value={form.sectionId} onValueChange={(v) => onChange("sectionId", v)}>
                <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                <SelectContent>
                  {sections
                    .filter((s) => !form.classId || String(s.classId) === form.classId)
                    .map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Roll Number">
            <Input value={form.rollNumber} onChange={(e) => onChange("rollNumber", e.target.value)} />
          </Field>
          <Field label="House">
            <Input value={form.house} onChange={(e) => onChange("house", e.target.value)} />
          </Field>
          <Field label="Student Status">
            <Select value={form.status} onValueChange={(v) => onChange("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STUDENT_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Address (legacy)" className="sm:col-span-2">
            <Input required value={form.address} onChange={(e) => onChange("address", e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Media</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Student Photo URL">
            <Input value={form.photoUrl} onChange={(e) => onChange("photoUrl", e.target.value)} placeholder="Cloudinary URL or upload via Documents" />
          </Field>
          <Field label="Student Signature URL (optional)">
            <Input value={form.signatureUrl} onChange={(e) => onChange("signatureUrl", e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      {!isEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Legacy Parent Contact (required for enrollment)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Father's Name">
              <Input required value={form.fatherName} onChange={(e) => onChange("fatherName", e.target.value)} />
            </Field>
            <Field label="Mother's Name">
              <Input required value={form.motherName} onChange={(e) => onChange("motherName", e.target.value)} />
            </Field>
            <Field label="Parent Mobile">
              <Input required value={form.parentPhone} onChange={(e) => onChange("parentPhone", e.target.value)} />
            </Field>
            <Field label="Parent Email">
              <Input type="email" required value={form.parentEmail} onChange={(e) => onChange("parentEmail", e.target.value)} />
            </Field>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
