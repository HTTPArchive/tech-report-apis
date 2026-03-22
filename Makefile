.PHONY: *
ENV ?= dev

tf_plan:
	cd terraform/ && terraform init -reconfigure -backend-config=backend-$(ENV).hcl -upgrade && terraform fmt -check && terraform validate && terraform plan --var="environment=$(ENV)"

tf_apply:
	cd terraform/ && terraform init -reconfigure -backend-config=backend-$(ENV).hcl && terraform apply -auto-approve --var="environment=$(ENV)"
