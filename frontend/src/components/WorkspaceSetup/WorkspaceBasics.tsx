import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface WorkspaceBasicsProps {
  companyName?: string;
  website?: string;
  industry?: string;
  onCompanyNameChange?: (value: string) => void;
  onWebsiteChange?: (value: string) => void;
  onIndustryChange?: (value: string) => void;
}

export const WorkspaceBasics: React.FC<WorkspaceBasicsProps> = ({
  companyName,
  website,
  industry,
  onCompanyNameChange,
  onWebsiteChange,
  onIndustryChange,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Workspace Basics</h3>
        <p className="text-sm text-muted-foreground mb-4">Tell us about your company and industry.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="company-name">Company Name</Label>
          <Input
            id="company-name"
            placeholder="e.g. Acme Corp"
            value={companyName}
            onChange={(event) => onCompanyNameChange?.(event.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="industry">Industry/Category</Label>
          <Select value={industry} onValueChange={onIndustryChange}>
            <SelectTrigger id="industry">
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dev-tools">Developer Tools</SelectItem>
              <SelectItem value="devops">DevOps</SelectItem>
              <SelectItem value="data-infra">Data Infrastructure</SelectItem>
              <SelectItem value="cybersecurity">Cybersecurity</SelectItem>
              <SelectItem value="fintech">Fintech SaaS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="website">Company Website</Label>
          <Input
            id="website"
            type="url"
            placeholder="https://www.acme.com"
            value={website}
            onChange={(event) => onWebsiteChange?.(event.target.value)}
          />
        </div>
      </div>
    </div>
  );
};