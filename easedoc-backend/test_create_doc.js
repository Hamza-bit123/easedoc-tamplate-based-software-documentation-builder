import { createDocumentService } from "./src/services/document.service.js";

async function test() {
  try {
    const res = await createDocumentService({
      user_id: 1,
      template_id: 13,
      title: "Test doc"
    });
    console.log("Success:", res);
  } catch (err) {
    console.error("Error creating doc:");
    console.error(err);
  }
  process.exit();
}

test();
