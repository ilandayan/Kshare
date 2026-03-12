"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil } from "lucide-react";
import { EditProfileForm } from "@/components/shop/edit-profile-form";

interface ShopProfileClientProps {
  commerce: {
    name: string;
    address: string;
    city: string;
    postal_code: string | null;
    phone: string | null;
    email: string | null;
    commerce_type: string | null;
    hashgakha: string | null;
  };
}

export function ShopProfileClient({ commerce }: ShopProfileClientProps) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => setEditing(true)}
          className="cursor-pointer gap-1.5"
        >
          <Pencil className="h-4 w-4" />
          Modifier le profil
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Modifier les informations</CardTitle>
      </CardHeader>
      <CardContent>
        <EditProfileForm
          commerce={commerce}
          onClose={() => setEditing(false)}
        />
      </CardContent>
    </Card>
  );
}
