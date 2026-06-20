.PHONY: *
ENV ?= dev

tf_plan:
	cd terraform/ && terraform init -reconfigure -backend-config=backend-$(ENV).hcl -upgrade && terraform fmt -check && terraform validate && terraform plan --var="environment=$(ENV)" $(ARGS)

tf_apply:
	cd terraform/ && terraform init -reconfigure -backend-config=backend-$(ENV).hcl && terraform apply -auto-approve --var="environment=$(ENV)" $(ARGS)


tf_import:
	cd terraform/ && terraform init -reconfigure -backend-config=backend-$(ENV).hcl && terraform import --var="environment=$(ENV)" '$(ADDR)' '$(ID)'

test_live:
	chmod +x scripts/run-live-tests.sh
	bash ./scripts/run-live-tests.sh

run:
	chmod +x scripts/run-local-server.sh
	bash ./scripts/run-local-server.sh

test:
	npx turbo run test
