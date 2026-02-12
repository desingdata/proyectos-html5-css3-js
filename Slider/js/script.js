class HeroSlider {
    constructor() {
        this.currentSlide = 0;
        this.slides = document.querySelectorAll('.slide');
        this.indicators = document.querySelectorAll('.indicator');
        this.prevBtn = document.querySelector('.prev-btn');
        this.nextBtn = document.querySelector('.next-btn');
        this.counter = document.querySelector('.current-number');
        this.autoplayInterval = null;
        this.autoplayDelay = 5000;

        this.init();
    }

    init() {

        this.prevBtn.addEventListener('click', () => this.prevSlide());
        this.nextBtn.addEventListener('click', () => this.nextSlide());

        this.indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => this.goToSlide(index));
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.prevSlide();
            if (e.key === 'ArrowRight') this.nextSlide();
        });

        this.handleTouch();

        this.startAutoplay();

        const slider = document.querySelector('.hero-slider');
        slider.addEventListener('mouseenter', () => this.stopAutoplay());
        slider.addEventListener('mouseleave', () => this.startAutoplay());
    }

    goToSlide(index) {
        this.slides[this.currentSlide].classList.remove('active');
        this.slides[this.currentSlide].classList.add('prev');
        this.indicators[this.currentSlide].classList.remove('active');

        this.currentSlide = index;

        this.slides.forEach(slide => slide.classList.remove('prev'));
        this.slides[this.currentSlide].classList.add('active');
        this.indicators[this.currentSlide].classList.add('active');

        this.counter.textContent = String(this.currentSlide + 1).padStart(2, '0');

        this.stopAutoplay();
        this.startAutoplay();
    }

    nextSlide() {
        const next = (this.currentSlide + 1) % this.slides.length;
        this.goToSlide(next);
    }

    prevSlide() {
        const prev = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
        this.goToSlide(prev);
    }

    startAutoplay() {
        this.autoplayInterval = setInterval(() => {
            this.nextSlide();
        }, this.autoplayDelay);
    }

    stopAutoplay() {
        if (this.autoplayInterval) {
            clearInterval(this.autoplayInterval);
        }
    }

    handleTouch() {
        let touchStartX = 0;
        let touchEndX = 0;
        const slider = document.querySelector('.hero-slider');

        slider.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        slider.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        }, { passive: true });

        const handleSwipe = () => {
            if (touchStartX - touchEndX > 50) {
                this.nextSlide();
            }
            if (touchEndX - touchStartX > 50) {
                this.prevSlide();
            }
        };

        this.handleSwipe = handleSwipe;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new HeroSlider();
});