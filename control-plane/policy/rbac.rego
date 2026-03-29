package planetary.authz

default allow := false

allow if {
  input.subject.tenant_id == input.resource.tenant_id
  role_allows_action
}

role_allows_action if {
  some role
  role := input.subject.roles[_]
  input.action == data.role_permissions[role][_]
}

requires_human_review if {
  input.action == "publish_strategic_recommendation"
  input.resource.sensitivity == "high"
}
