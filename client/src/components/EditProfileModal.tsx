import React, { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Activity,
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Droplet,
  HeartPulse,
  IdCard,
  Mail,
  MapPin,
  Phone,
  PhoneCall,
  Save,
  Shield,
  User,
  UserCheck,
  UserCog,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { MAHARASHTRA_DISTRICTS, getCitiesForDistrict } from "@shared/maharashtraLocations";

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const roleDisplayNames: Record<string, string> = {
  citizen: "Citizen",
  asha: "ASHA Worker",
  cho: "CHO Officer",
  asha_cho: "ASHA / CHO",
  doctor: "Doctor",
  facility_staff: "Facility Staff",
  administrator: "District Administrator",
  admin: "District Administrator",
};

export function EditProfileModal({
  open,
  onOpenChange,
  onSuccess,
}: EditProfileModalProps) {
  const { user, refresh } = useAuth();
  const utils = trpc.useUtils();

  // Form Fields
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || "");
  const [age, setAge] = useState<number | string>(user?.age ?? "");
  const [gender, setGender] = useState(user?.gender || "");
  const [village, setVillage] = useState(user?.village || "");
  const [district, setDistrict] = useState(user?.district || "");
  const [address, setAddress] = useState(user?.address || "");
  const [pincode, setPincode] = useState(user?.pincode || "");
  const [emergencyContactName, setEmergencyContactName] = useState(user?.emergencyContactName || "");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(user?.emergencyContactPhone || "");
  const [bloodGroup, setBloodGroup] = useState(user?.bloodGroup || "");
  const [allergies, setAllergies] = useState(user?.allergies || "");
  const [conditions, setConditions] = useState(user?.conditions || "");
  const [abhaId, setAbhaId] = useState(user?.abhaId || "");

  const prevOpenRef = React.useRef(open);

  // Sync state ONLY when modal transitions from closed to open
  useEffect(() => {
    if (open && !prevOpenRef.current && user) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setDateOfBirth(user.dateOfBirth || "");
      setAge(user.age ?? "");
      setGender(user.gender || "");
      setVillage(user.village || "");
      setDistrict(user.district || "");
      setAddress(user.address || "");
      setPincode(user.pincode || "");
      setEmergencyContactName(user.emergencyContactName || "");
      setEmergencyContactPhone(user.emergencyContactPhone || "");
      setBloodGroup(user.bloodGroup || "");
      setAllergies(user.allergies || "");
      setConditions(user.conditions || "");
      setAbhaId(user.abhaId || "");
    }
    prevOpenRef.current = open;
  }, [open, user]);

  // Calculate age automatically from DOB
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dobValue = e.target.value;
    setDateOfBirth(dobValue);
    if (dobValue) {
      const parsed = new Date(dobValue);
      if (!isNaN(parsed.getTime())) {
        const diffMs = Date.now() - parsed.getTime();
        const calculatedAge = Math.max(0, Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000)));
        setAge(calculatedAge);
      }
    }
  };

  const updateMutation = trpc.profile.update.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Full name cannot be empty.");
      return;
    }

    const payload = {
      name: name.trim() || undefined,
      phone: phone.trim() || undefined,
      dateOfBirth: dateOfBirth || undefined,
      age: age !== "" && !isNaN(Number(age)) ? Number(age) : undefined,
      gender: gender || undefined,
      village: village.trim() || undefined,
      district: district || undefined,
      address: address.trim() || undefined,
      pincode: pincode.trim() || undefined,
      emergencyContactName: emergencyContactName.trim() || undefined,
      emergencyContactPhone: emergencyContactPhone.trim() || undefined,
      bloodGroup: bloodGroup || undefined,
      allergies: allergies.trim() || undefined,
      conditions: conditions.trim() || undefined,
      abhaId: abhaId.trim() || undefined,
    };

    try {
      // 1. Sync directly to Supabase client auth metadata if connected
      if (supabase) {
        try {
          await supabase.auth.updateUser({
            data: {
              full_name: payload.name,
              name: payload.name,
              phone: payload.phone,
              date_of_birth: payload.dateOfBirth,
              age: payload.age,
              gender: payload.gender,
              village: payload.village,
              district: payload.district,
              address: payload.address,
              pincode: payload.pincode,
              emergency_contact_name: payload.emergencyContactName,
              emergency_contact_phone: payload.emergencyContactPhone,
              blood_group: payload.bloodGroup,
              allergies: payload.allergies,
              conditions: payload.conditions,
              abha_id: payload.abhaId,
            },
          });
        } catch (sbErr) {
          console.warn("[Supabase] Client user_metadata update warning:", sbErr);
        }
      }

      // 2. Persist to server database
      const res = await updateMutation.mutateAsync(payload);

      // 3. Immediately update TRPC query cache
      if (res?.user) {
        utils.auth.me.setData(undefined, res.user as any);
        utils.profile.get.setData(undefined, res.user as any);
      }

      // 4. Invalidate dependent queries
      await Promise.all([
        utils.auth.me.invalidate(),
        utils.profile.get.invalidate(),
        utils.patients.list.invalidate(),
        utils.patients.timeline.invalidate(),
        utils.patients.getProfile.invalidate(),
        utils.dashboard.overview.invalidate(),
        utils.alerts.list.invalidate(),
      ]);

      refresh();
      toast.success("Profile saved and updated across all dashboards!");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile changes.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#15181b] dark:bg-slate-800 text-white font-bold">
                <UserCog className="h-5 w-5 text-[#8dc5e3]" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                  Edit Profile & Demographics
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Update your identity, location, medical baseline, and emergency contacts.
                </DialogDescription>
              </div>
            </div>
            {user?.role && (
              <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                {roleDisplayNames[user.role] || user.role}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Section 1: Basic Identity & Contact */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              1. Identity & Contact Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                  className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs h-10 focus:bg-white dark:focus:bg-slate-900"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Mobile Phone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98221 00000"
                  className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs h-10 focus:bg-white dark:focus:bg-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Demographics & Age */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              2. Demographics & Age
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Date of Birth</Label>
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={handleDobChange}
                  className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs h-10 focus:bg-white dark:focus:bg-slate-900"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Age (Years)</Label>
                <Input
                  type="number"
                  min="0"
                  max="130"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 38"
                  className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs h-10 focus:bg-white dark:focus:bg-slate-900"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Gender</Label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900"
                >
                  <option value="">Select Gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                  <option value="undisclosed">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Health Baseline & Medical Attributes */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              3. Health Baseline & Medical Identity
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Blood Group</Label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900"
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">ABHA / Ayushman Health ID</Label>
                <Input
                  value={abhaId}
                  onChange={(e) => setAbhaId(e.target.value)}
                  placeholder="e.g. 91-8201-9921-0001"
                  className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs h-10 focus:bg-white dark:focus:bg-slate-900"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Known Allergies</Label>
                <Input
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Sulfa, Dust, None"
                  className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs h-10 focus:bg-white dark:focus:bg-slate-900"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Chronic / Existing Conditions</Label>
                <Input
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  placeholder="e.g. Hypertension, Type 2 Diabetes, Asthma"
                  className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs h-10 focus:bg-white dark:focus:bg-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Residential Location & Address */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              4. Residential Location & Address
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">District (Maharashtra)</Label>
                <select
                  value={district}
                  onChange={(e) => {
                    setDistrict(e.target.value);
                    setVillage("");
                  }}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900"
                >
                  <option value="">Select District</option>
                  {MAHARASHTRA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div
                className="space-y-1 relative cursor-pointer"
                onClickCapture={(e) => {
                  if (!district) {
                    e.stopPropagation();
                    toast.error("Please select a district first");
                  }
                }}
              >
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">City / Village / Taluka</Label>
                <select
                  value={village}
                  disabled={!district}
                  onChange={(e) => setVillage(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">{district ? "Select City / Village / Taluka" : "Please select district first"}</option>
                  {district && getCitiesForDistrict(district).map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                  {village && district && !getCitiesForDistrict(district).includes(village) && (
                    <option value={village}>{village}</option>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Street / House Address</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House No., Street, Ward"
                  className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs h-10 focus:bg-white dark:focus:bg-slate-900"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pincode</Label>
                <Input
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="e.g. 423101"
                  className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs h-10 focus:bg-white dark:focus:bg-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Emergency Contacts */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              5. Emergency Contacts
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Emergency Contact Person</Label>
                <Input
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder="e.g. Suresh Patel (Brother)"
                  className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs h-10 focus:bg-white dark:focus:bg-slate-900"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Emergency Contact Phone</Label>
                <Input
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  placeholder="+91 98221 00000"
                  className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs h-10 focus:bg-white dark:focus:bg-slate-900"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs h-10 px-5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded-xl bg-[#15181b] hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs h-10 px-6 gap-2 shadow-sm"
            >
              <Save className="h-4 w-4" />
              <span>{updateMutation.isPending ? "Saving Changes..." : "Save Profile"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditProfileModal;
