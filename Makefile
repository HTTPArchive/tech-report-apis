.PHONY: *

TF := terraform -chdir=terraform

tf_init:
	$(TF) init

tf_plan: tf_init
	$(TF) fmt -check && $(TF) validate && $(TF) plan $(ARGS)

tf_apply: tf_init
	$(TF) apply -auto-approve $(ARGS)

tf_import: tf_init
	$(TF) import '$(ADDR)' '$(ID)'

test_live:
	chmod +x scripts/run-live-tests.sh
	bash ./scripts/run-live-tests.sh

run:
	chmod +x scripts/run-local-server.sh
	bash ./scripts/run-local-server.sh

test:
	npx turbo run test
