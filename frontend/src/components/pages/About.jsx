import React from 'react';

export default function About() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="text-4xl lg:text-6xl font-extrabold text-center mb-10">About Telvy</h1>

      <section className="mb-10 space-y-4">
        <p className="text-lg leading-relaxed text-base-content/80">
          Telvy is a forward-thinking platform committed to reshaping the way people engage with technology.
          Born out of a passion for innovation and user-centric design, Telvy aims to bridge the gap between
          functionality and creativity. Whether you're an individual creator or part of a large organization,
          Telvy offers tools and insights to help you thrive in a rapidly evolving digital landscape.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-2">Our Mission</h2>
        <p className="text-base text-base-content/80 leading-relaxed">
          We aim to empower people through intuitive design, robust technology, and accessible solutions.
          We believe in simplicity, clarity, and meaningful impact — ensuring that every feature we develop
          adds real-world value and makes life easier for our users.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-2">What We Do</h2>
        <ul className="list-disc list-inside text-base text-base-content/80 space-y-1">
          <li>Develop open-source tools that make development faster and more enjoyable</li>
          <li>Provide UI frameworks that are modern, responsive, and customizable</li>
          <li>Support creators and developers through community and documentation</li>
          <li>Continuously improve based on user feedback and real-world needs</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-2">Our Team</h2>
        <p className="text-base text-base-content/80 leading-relaxed">
          We're a passionate team of designers, engineers, and storytellers who believe that great
          products are built through collaboration. We value transparency, inclusion, and experimentation —
          and we love what we do.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-2">Get Involved</h2>
        <p className="text-base text-base-content/80 leading-relaxed">
          Want to be a part of our journey? We’re always looking for curious minds and driven individuals to
          join our community. Whether you're contributing code, designing features, or simply exploring what
          Telvy can do — you're welcome here.
        </p>
      </section>
    </div>
  );
}
