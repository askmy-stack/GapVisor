from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=1)
    organization_name: str = Field(min_length=1)
    brand_name: str = Field(min_length=1)


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    avatar_url: str | None = None

    model_config = {"from_attributes": True}


class MembershipOut(BaseModel):
    workspace_id: str
    role: str
    status: str
    workspace_name: str
    brand_name: str


class WorkspaceOut(BaseModel):
    id: str
    name: str
    brand_name: str
    monitoring_frequency: str
    timezone: str
    onboarding_completed_at: str | None = None

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    memberships: list[MembershipOut]


class MeResponse(BaseModel):
    user: UserOut
    memberships: list[MembershipOut]
