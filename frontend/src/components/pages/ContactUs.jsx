import { useState } from "react";
import toast from "react-hot-toast";

function ContactUs() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      setSubmitting(true);
      // Here you can send to backend or email API like EmailJS, Formspree, etc.
      toast.success("Message sent successfully!");
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-10 px-40">
      <h1 className="text-2xl lg:text-4xl font-bold mb-4">Contact Us</h1>
      <p className="mb-4">
        Have a question, idea, or feedback? We'd love to hear from you.
        Use the form below or reach out through the provided channels.
      </p>

      <div className="grid lg:grid-cols-2 gap-2 py-2">
        {/* Contact form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <fieldset className="bg-base-200 border-base-300 rounded-box w-full border p-6">
            <legend className="text-lg font-semibold">Send a Message</legend>

            <label className="label"><span className="label-text">Name</span></label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="input input-bordered w-full"
              placeholder="John Doe"
              required
            />

            <label className="label"><span className="label-text">Email</span></label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="input input-bordered w-full"
              placeholder="you@example.com"
              required
            />

            <label className="label"><span className="label-text">Message</span></label>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              className="textarea textarea-bordered w-full"
              placeholder="Your message..."
              required
            />

            <button
              className="btn btn-primary mt-4"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Sending..." : "Send Message"}
            </button>
          </fieldset>
        </form>

        {/* Contact details */}
        <div className="space-y-2 p-4">
          <h2 className="text-2xl font-semibold">Reach Out</h2>
          <p><strong>Email:</strong> support@telvy.com</p>
          <p><strong>Phone:</strong> +1 123456789</p>
          <p><strong>Address:</strong><br />123 Home,<br />City</p>
          <p>We typically respond within 24 hours during business days.</p>
        </div>
      </div>
    </div>
  );
}

export default ContactUs;
